import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app.js";
import { createMockRedisClient, type MockRedisClient } from "../helpers/mockRedisClient.js";

// Hoist the mock so it applies before any route module imports redisClient
vi.mock("../../utils/redisClient.js", () => ({
    initializeRedisClient: vi.fn(),
}));

// Import AFTER vi.mock so we get the mocked version
import { initializeRedisClient } from "../../utils/redisClient.js";

describe("Restaurant routes", () => {
    let mockClient: MockRedisClient;

    beforeEach(() => {
        mockClient = createMockRedisClient();
        vi.mocked(initializeRedisClient).mockResolvedValue(mockClient as any);
    });

    // -------------------------------------------------------------------------
    // GET /restaurants
    // -------------------------------------------------------------------------
    describe("GET /restaurants", () => {
        it("returns an empty list when no restaurants exist", async () => {
            mockClient.zRange.mockResolvedValue([]);
            const res = await request(app).get("/restaurants");
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toEqual([]);
        });

        it("returns paginated restaurants ordered by rating", async () => {
            mockClient.zRange.mockResolvedValue(["id1", "id2"]);
            mockClient.hGetAll.mockResolvedValue({ id: "id1", name: "Pasta Place", location: "40.7,-74.0" });

            const res = await request(app).get("/restaurants?page=1&limit=2");
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(2);
            expect(mockClient.zRange).toHaveBeenCalledWith(
                expect.any(String),
                0, // start
                1, // end
                { REV: true }
            );
        });
    });

    // -------------------------------------------------------------------------
    // POST /restaurants
    // -------------------------------------------------------------------------
    describe("POST /restaurants", () => {
        const validBody = {
            name: "Pasta Palace",
            location: "40.7128,-74.0060",
            cuisines: ["Italian"],
        };

        it("creates a new restaurant and returns its data", async () => {
            mockClient.bf.exists.mockResolvedValue(false);

            const res = await request(app).post("/restaurants").send(validBody);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toMatchObject({ name: "Pasta Palace", location: "40.7128,-74.0060" });
            expect(res.body.data).toHaveProperty("id");
        });

        it("returns 409 when the restaurant already exists (bloom filter hit)", async () => {
            mockClient.bf.exists.mockResolvedValue(true);

            const res = await request(app).post("/restaurants").send(validBody);
            expect(res.status).toBe(409);
            expect(res.body.success).toBe(false);
        });

        it("returns 400 for an empty name", async () => {
            const res = await request(app)
                .post("/restaurants")
                .send({ name: "", location: "40.7,-74.0", cuisines: ["Italian"] });
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.errors).toBeDefined();
        });

        it("returns 400 when cuisines is missing", async () => {
            const res = await request(app)
                .post("/restaurants")
                .send({ name: "Test", location: "40.7,-74.0" });
            expect(res.status).toBe(400);
        });

        it("returns 400 for a non-array cuisines value", async () => {
            const res = await request(app)
                .post("/restaurants")
                .send({ name: "Test", location: "40.7,-74.0", cuisines: "Italian" });
            expect(res.status).toBe(400);
        });

        it("persists cuisine sets and sorted-set score on creation", async () => {
            mockClient.bf.exists.mockResolvedValue(false);
            await request(app).post("/restaurants").send(validBody);

            expect(mockClient.sAdd).toHaveBeenCalled();
            expect(mockClient.zAdd).toHaveBeenCalled();
            expect(mockClient.bf.add).toHaveBeenCalled();
        });
    });

    // -------------------------------------------------------------------------
    // GET /restaurants/search
    // -------------------------------------------------------------------------
    describe("GET /restaurants/search", () => {
        it("returns search results from RediSearch", async () => {
            const fakeResults = { total: 1, documents: [{ id: "id1", value: { name: "Pasta" } }] };
            mockClient.ft.search.mockResolvedValue(fakeResults);

            const res = await request(app).get("/restaurants/search?q=pasta");
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual(fakeResults);
        });

        it("returns empty results when nothing matches", async () => {
            mockClient.ft.search.mockResolvedValue({ total: 0, documents: [] });

            const res = await request(app).get("/restaurants/search?q=unknown");
            expect(res.status).toBe(200);
            expect(res.body.data.total).toBe(0);
        });
    });

    // -------------------------------------------------------------------------
    // Routes that require an existing restaurant
    // -------------------------------------------------------------------------
    describe("routes protected by checkRestaurantExists", () => {
        it("returns 404 when the restaurant does not exist", async () => {
            mockClient.exists.mockResolvedValue(0);
            const res = await request(app).get("/restaurants/nonexistent/reviews");
            expect(res.status).toBe(404);
        });
    });

    // -------------------------------------------------------------------------
    // POST /restaurants/:restaurantId/details
    // -------------------------------------------------------------------------
    describe("POST /restaurants/:restaurantId/details", () => {
        const validDetails = {
            links: [{ name: "Website", url: "https://pasta.com" }],
            contact: { phone: "555-1234", email: "hi@pasta.com" },
        };

        it("stores restaurant details in RedisJSON", async () => {
            mockClient.exists.mockResolvedValue(1);

            const res = await request(app)
                .post("/restaurants/id1/details")
                .send(validDetails);
            expect(res.status).toBe(200);
            expect(mockClient.json.set).toHaveBeenCalled();
        });

        it("returns 400 for an invalid email in details", async () => {
            mockClient.exists.mockResolvedValue(1);

            const res = await request(app)
                .post("/restaurants/id1/details")
                .send({ ...validDetails, contact: { phone: "555", email: "bad" } });
            expect(res.status).toBe(400);
        });
    });

    // -------------------------------------------------------------------------
    // GET /restaurants/:restaurantId/details
    // -------------------------------------------------------------------------
    describe("GET /restaurants/:restaurantId/details", () => {
        it("returns stored JSON details", async () => {
            mockClient.exists.mockResolvedValue(1);
            mockClient.json.get.mockResolvedValue({ links: [], contact: { phone: "555", email: "a@b.com" } });

            const res = await request(app).get("/restaurants/id1/details");
            expect(res.status).toBe(200);
            expect(res.body.data).toBeDefined();
        });
    });

    // -------------------------------------------------------------------------
    // POST /restaurants/:restaurantId/reviews
    // -------------------------------------------------------------------------
    describe("POST /restaurants/:restaurantId/reviews", () => {
        it("creates a review and updates the average rating", async () => {
            mockClient.exists.mockResolvedValue(1);
            mockClient.lPush.mockResolvedValue(1); // reviewCount = 1
            mockClient.hIncrByFloat.mockResolvedValue(4); // totalRating = 4

            const res = await request(app)
                .post("/restaurants/id1/reviews")
                .send({ review: "Excellent!", rating: 4 });

            expect(res.status).toBe(200);
            expect(res.body.data).toMatchObject({ review: "Excellent!", rating: 4, restaurantId: "id1" });
            expect(res.body.data).toHaveProperty("id");
            expect(res.body.data).toHaveProperty("timestamp");

            // average rating should be stored back
            // Number("4.0").toString() === "4", so the stored value is "4"
            expect(mockClient.zAdd).toHaveBeenCalled();
            expect(mockClient.hSet).toHaveBeenCalledWith(
                expect.any(String),
                "averageRating",
                "4"
            );
        });

        it("returns 400 for a rating out of range", async () => {
            mockClient.exists.mockResolvedValue(1);

            const res = await request(app)
                .post("/restaurants/id1/reviews")
                .send({ review: "Too good", rating: 10 });
            expect(res.status).toBe(400);
        });

        it("returns 400 for an empty review string", async () => {
            mockClient.exists.mockResolvedValue(1);

            const res = await request(app)
                .post("/restaurants/id1/reviews")
                .send({ review: "", rating: 3 });
            expect(res.status).toBe(400);
        });
    });

    // -------------------------------------------------------------------------
    // GET /restaurants/:restaurantId/reviews
    // -------------------------------------------------------------------------
    describe("GET /restaurants/:restaurantId/reviews", () => {
        it("returns a paginated list of reviews", async () => {
            mockClient.exists.mockResolvedValue(1);
            mockClient.lRange.mockResolvedValue(["rev1", "rev2"]);
            mockClient.hGetAll.mockResolvedValue({ id: "rev1", review: "Nice", rating: "4" });

            const res = await request(app).get("/restaurants/id1/reviews");
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(2);
        });

        it("returns an empty list when no reviews exist", async () => {
            mockClient.exists.mockResolvedValue(1);
            mockClient.lRange.mockResolvedValue([]);

            const res = await request(app).get("/restaurants/id1/reviews");
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual([]);
        });
    });

    // -------------------------------------------------------------------------
    // DELETE /restaurants/:restaurantId/reviews/:reviewId
    // -------------------------------------------------------------------------
    describe("DELETE /restaurants/:restaurantId/reviews/:reviewId", () => {
        it("deletes a review successfully", async () => {
            mockClient.exists.mockResolvedValue(1);
            mockClient.lRem.mockResolvedValue(1);
            mockClient.del.mockResolvedValue(1);

            const res = await request(app).delete("/restaurants/id1/reviews/rev1");
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual({ reviewId: "rev1" });
        });

        it("returns 404 when the review does not exist", async () => {
            mockClient.exists.mockResolvedValue(1);
            mockClient.lRem.mockResolvedValue(0);
            mockClient.del.mockResolvedValue(0);

            const res = await request(app).delete("/restaurants/id1/reviews/ghost");
            expect(res.status).toBe(404);
        });
    });
});
