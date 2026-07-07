import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app.js";
import { createMockRedisClient, type MockRedisClient } from "../helpers/mockRedisClient.js";

vi.mock("../../utils/redisClient.js", () => ({
    initializeRedisClient: vi.fn(),
}));

import { initializeRedisClient } from "../../utils/redisClient.js";

describe("Cuisine routes", () => {
    let mockClient: MockRedisClient;

    beforeEach(() => {
        mockClient = createMockRedisClient();
        vi.mocked(initializeRedisClient).mockResolvedValue(mockClient as any);
    });

    // -------------------------------------------------------------------------
    // GET /cuisines
    // -------------------------------------------------------------------------
    describe("GET /cuisines", () => {
        it("returns all cuisines from the global set", async () => {
            mockClient.sMembers.mockResolvedValue(["Italian", "Mexican", "Japanese"]);

            const res = await request(app).get("/cuisines");
            expect(res.status).toBe(200);
            expect(res.body.cuisines).toEqual(["Italian", "Mexican", "Japanese"]);
        });

        it("returns an empty array when no cuisines exist", async () => {
            mockClient.sMembers.mockResolvedValue([]);

            const res = await request(app).get("/cuisines");
            expect(res.status).toBe(200);
            expect(res.body.cuisines).toEqual([]);
        });
    });

    // -------------------------------------------------------------------------
    // GET /cuisines/:cuisine
    // -------------------------------------------------------------------------
    describe("GET /cuisines/:cuisine", () => {
        it("returns restaurant names for the given cuisine", async () => {
            mockClient.sMembers.mockResolvedValue(["id1", "id2"]);
            mockClient.hGet
                .mockResolvedValueOnce("Pasta Palace")
                .mockResolvedValueOnce("Rome Trattoria");

            const res = await request(app).get("/cuisines/Italian");
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual(["Pasta Palace", "Rome Trattoria"]);
        });

        it("returns an empty list when no restaurants serve that cuisine", async () => {
            mockClient.sMembers.mockResolvedValue([]);

            const res = await request(app).get("/cuisines/Unknown");
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual([]);
        });

        it("returns null entries when a restaurant hash has no name field", async () => {
            mockClient.sMembers.mockResolvedValue(["id1"]);
            mockClient.hGet.mockResolvedValue(null);

            const res = await request(app).get("/cuisines/Italian");
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual([null]);
        });
    });
});
