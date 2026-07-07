import express from 'express';
import { initializeRedisClient } from '../utils/redisClient.js';
import { cuisineKey, cuisinesKey, restaurantKeyById } from '../utils/redisKeys.js';
import { successResponse } from '../utils/responses.js';
const router = express.Router();

router.get("/", async (req, res, next) => {
    try {
        const client = await initializeRedisClient();
        const cuisines = await client.sMembers(cuisinesKey);
        return res.json({ cuisines });
    } catch (error) {
        next(error); // Pass the error to the error handling middleware
    }
});

router.get("/:cuisine", async (req, res, next) => {
    const { cuisine } = req.params;
    try {
        const client = await initializeRedisClient();
        const restaurantIds = await client.sMembers(cuisineKey(cuisine));
        const restaurants = await Promise.all(
            restaurantIds.map((id) => client.hGet(restaurantKeyById(id), 'name'))
        );
        return successResponse(res, restaurants);
    } catch (error) {
        next(error); // Pass the error to the error handling middleware
    }
});

export default router;