import express, { type Request } from 'express';
import { RestaurantSchema } from '../schemas/restaurant.js';
import { validate } from '../middlewares/validate.js';
import { initializeRedisClient } from '../utils/redisClient.js';
import { restaurantKeyById, reviewDetailsKeyById, reviewKeyById } from '../utils/redisKeys.js';
import { nanoid } from 'nanoid';
import { errorResponse, successResponse } from '../utils/responses.js';
import { checkRestaurantExists } from '../middlewares/checkRestaurantId.js';
import { ReviewSchema, type Review } from '../schemas/review.js';
const router = express.Router();

router.post("/", validate(RestaurantSchema), async (req, res, next) => {
    const data = req.body;
    try {
        const client = await initializeRedisClient();
        const id = nanoid(); // Generate a unique ID for the restaurant
        const restaurantKey = restaurantKeyById(id);
        const hashData = {
            id, name: data.name, location: data.location 
        };
        const addResult = await client.hSet(restaurantKey, hashData);
        console.log(`Added restaurant with ID ${id}:`, addResult);
        return successResponse(res, hashData, "Added new restaurant successfully");
    } catch (error) {
        next(error); // Pass the error to the error handling middleware
    }

    res.send(`Received data: ${JSON.stringify(data)}`);
});

router.post("/:restaurantId/reviews", checkRestaurantExists, validate(ReviewSchema), async (req: Request<{restaurantId: string}>, res, next) => {
    const { restaurantId } = req.params;
    const data = req.body as Review;
    try {
        const client = await initializeRedisClient();
        const reviewId = nanoid();
        const reviewKey = reviewKeyById(restaurantId);
        const reviewDetailsKey = reviewDetailsKeyById(reviewId);
        const reviewData = {
            id: reviewId,
            ...data,
            timestamp: Date.now(),
            restaurantId,
        };
        await Promise.all([
            client.lPush(reviewKey, reviewId), // Store the review ID in the restaurant's review list
            client.hSet(reviewDetailsKey, reviewData) // Store the review details in a hash,
        ]);
        return successResponse(res, reviewData, "Added new review successfully");
    } catch (error) {
        next(error); // Pass the error to the error handling middleware
    }
});

router.get("/:restaurantId/reviews", checkRestaurantExists, async (req: Request<{ restaurantId: string }>, res, next) => {
    const { restaurantId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const start = (Number(page) - 1) * Number(limit);
    const end = start + Number(limit) - 1;

    try {
        const client = await initializeRedisClient();
        const reviewKey = reviewKeyById(restaurantId);
        const reviewIds = await client.lRange(reviewKey, start, end);
        const reviews = await Promise.all(reviewIds.map(id => client.hGetAll(reviewDetailsKeyById(id))));
        return successResponse(res, reviews, "Fetched reviews successfully");
    } catch (error) {
        next(error); // Pass the error to the error handling middleware
    }
});

router.delete("/:restaurantId/reviews/:reviewId", checkRestaurantExists, async (req: Request<{ restaurantId: string; reviewId: string }>, res, next) => {
    const { restaurantId, reviewId } = req.params;
    try {
        const client = await initializeRedisClient();
        const reviewKey = reviewKeyById(restaurantId);
        const reviewDetailsKey = reviewDetailsKeyById(reviewId);
        const [removeResult, deleteResult] = await Promise.all([
            client.lRem(reviewKey, 0, reviewId), // Remove the review ID from the restaurant's review list
            client.del(reviewDetailsKey) // Delete the review details hash
        ]);
        if(removeResult === 0 && deleteResult === 0) {
            return errorResponse(res, 404, `Review with ID ${reviewId} not found for restaurant ${restaurantId}`);
        }
        return successResponse(res, { reviewId }, "Deleted review successfully");
    } catch (error) {
        next(error); // Pass the error to the error handling middleware
    }
});

router.get("/:restaurantId", checkRestaurantExists, async (req: Request<{ restaurantId: string }>, res, next) => {
    const { restaurantId } = req.params;
    try {
        const client = await initializeRedisClient();
        const restaurantKey = restaurantKeyById(restaurantId);
        const [viewCount, restaurantData] = await Promise.all([
            client.hIncrBy(restaurantKey, 'viewCount', 1), 
            client.hGetAll(restaurantKey)
        ]);
        return successResponse(res, restaurantData, "Fetched restaurant successfully");
    } catch (error) {
        next(error); // Pass the error to the error handling middleware
    }
});

export default router;