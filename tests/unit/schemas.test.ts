import { describe, it, expect } from "vitest";
import { RestaurantSchema, RestaurantDetailsSchema } from "../../schemas/restaurant.js";
import { ReviewSchema } from "../../schemas/review.js";

// ---------------------------------------------------------------------------
// RestaurantSchema
// ---------------------------------------------------------------------------
describe("RestaurantSchema", () => {
    it("accepts a valid restaurant", () => {
        const result = RestaurantSchema.safeParse({
            name: "Pasta Palace",
            location: "40.7128,-74.0060",
            cuisines: ["Italian"],
        });
        expect(result.success).toBe(true);
    });

    it("accepts multiple cuisines", () => {
        const result = RestaurantSchema.safeParse({
            name: "Fusion Spot",
            location: "51.5074,-0.1278",
            cuisines: ["Japanese", "Peruvian"],
        });
        expect(result.success).toBe(true);
    });

    it("rejects an empty name", () => {
        const result = RestaurantSchema.safeParse({
            name: "",
            location: "40.7128,-74.0060",
            cuisines: ["Italian"],
        });
        expect(result.success).toBe(false);
    });

    it("rejects an empty location", () => {
        const result = RestaurantSchema.safeParse({
            name: "Pasta Palace",
            location: "",
            cuisines: ["Italian"],
        });
        expect(result.success).toBe(false);
    });

    it("rejects a missing cuisines field", () => {
        const result = RestaurantSchema.safeParse({
            name: "Pasta Palace",
            location: "40.7128,-74.0060",
        });
        expect(result.success).toBe(false);
    });

    it("rejects an empty cuisines array entry", () => {
        const result = RestaurantSchema.safeParse({
            name: "Pasta Palace",
            location: "40.7128,-74.0060",
            cuisines: [""],
        });
        expect(result.success).toBe(false);
    });

    it("rejects a non-array cuisines value", () => {
        const result = RestaurantSchema.safeParse({
            name: "Pasta Palace",
            location: "40.7128,-74.0060",
            cuisines: "Italian",
        });
        expect(result.success).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// RestaurantDetailsSchema
// ---------------------------------------------------------------------------
describe("RestaurantDetailsSchema", () => {
    const validDetails = {
        links: [{ name: "Website", url: "https://pastapalace.com" }],
        contact: { phone: "555-1234", email: "info@pastapalace.com" },
    };

    it("accepts valid details", () => {
        expect(RestaurantDetailsSchema.safeParse(validDetails).success).toBe(true);
    });

    it("accepts an empty links array", () => {
        const result = RestaurantDetailsSchema.safeParse({
            ...validDetails,
            links: [],
        });
        expect(result.success).toBe(true);
    });

    it("rejects an invalid email", () => {
        const result = RestaurantDetailsSchema.safeParse({
            ...validDetails,
            contact: { phone: "555-1234", email: "not-an-email" },
        });
        expect(result.success).toBe(false);
    });

    it("rejects an invalid URL in links", () => {
        const result = RestaurantDetailsSchema.safeParse({
            ...validDetails,
            links: [{ name: "Website", url: "not-a-url" }],
        });
        expect(result.success).toBe(false);
    });

    it("rejects a link with an empty name", () => {
        const result = RestaurantDetailsSchema.safeParse({
            ...validDetails,
            links: [{ name: "", url: "https://example.com" }],
        });
        expect(result.success).toBe(false);
    });

    it("rejects missing contact phone", () => {
        const result = RestaurantDetailsSchema.safeParse({
            links: [],
            contact: { email: "info@example.com" },
        });
        expect(result.success).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// ReviewSchema
// ---------------------------------------------------------------------------
describe("ReviewSchema", () => {
    it("accepts a valid review", () => {
        expect(ReviewSchema.safeParse({ review: "Excellent!", rating: 5 }).success).toBe(true);
    });

    it("accepts minimum rating of 1", () => {
        expect(ReviewSchema.safeParse({ review: "Okay", rating: 1 }).success).toBe(true);
    });

    it("rejects a rating above 5", () => {
        expect(ReviewSchema.safeParse({ review: "Too good", rating: 6 }).success).toBe(false);
    });

    it("rejects a rating below 1", () => {
        expect(ReviewSchema.safeParse({ review: "Bad", rating: 0 }).success).toBe(false);
    });

    it("rejects an empty review string", () => {
        expect(ReviewSchema.safeParse({ review: "", rating: 3 }).success).toBe(false);
    });

    it("rejects a missing rating", () => {
        expect(ReviewSchema.safeParse({ review: "Nice" }).success).toBe(false);
    });
});
