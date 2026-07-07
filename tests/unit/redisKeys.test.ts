import { describe, it, expect } from "vitest";
import {
    getKeyName,
    restaurantKeyById,
    reviewKeyById,
    reviewDetailsKeyById,
    cuisinesKey,
    cuisineKey,
    restaurantCuisinesKeyById,
    restaurantsByRatingKey,
    weatherKeyByRestaurantId,
    restaurantDetailsKeyById,
    restaurantIndexKey,
    restaurantBloomKey,
} from "../../utils/redisKeys.js";

describe("getKeyName", () => {
    it("produces a URN-style key from multiple segments", () => {
        expect(getKeyName("a", "b", "c")).toBe("urn:key:a:b:c");
    });

    it("handles a single segment", () => {
        expect(getKeyName("x")).toBe("urn:key:x");
    });
});

describe("key builder functions", () => {
    it("restaurantKeyById", () => {
        expect(restaurantKeyById("abc")).toBe("urn:key:restaurants:abc");
    });

    it("reviewKeyById", () => {
        expect(reviewKeyById("abc")).toBe("urn:key:reviews:abc");
    });

    it("reviewDetailsKeyById", () => {
        expect(reviewDetailsKeyById("abc")).toBe("urn:key:review-details:abc");
    });

    it("cuisinesKey is a static string", () => {
        expect(cuisinesKey).toBe("urn:key:cuisines");
    });

    it("cuisineKey", () => {
        expect(cuisineKey("Italian")).toBe("urn:key:cuisines:Italian");
    });

    it("restaurantCuisinesKeyById", () => {
        expect(restaurantCuisinesKeyById("abc")).toBe("urn:key:restaurant_cuisines:abc");
    });

    it("restaurantsByRatingKey is a static string", () => {
        expect(restaurantsByRatingKey).toBe("urn:key:restaurants_by_rating");
    });

    it("weatherKeyByRestaurantId", () => {
        expect(weatherKeyByRestaurantId("abc")).toBe("urn:key:weather:abc");
    });

    it("restaurantDetailsKeyById", () => {
        expect(restaurantDetailsKeyById("abc")).toBe("urn:key:restaurant_details:abc");
    });

    it("restaurantIndexKey is a static string", () => {
        expect(restaurantIndexKey).toBe("urn:key:restaurant_index:restaurants");
    });

    it("restaurantBloomKey is a static string", () => {
        expect(restaurantBloomKey).toBe("urn:key:restaurant_bloom:restaurants");
    });
});
