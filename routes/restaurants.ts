import express, { type Request } from 'express';
import { RestaurantSchema } from '../schemas/restaurant.js';
import { validate } from '../middlewares/validate.js';
import { initializeRedisClient } from '../utils/redisClient.js';
import { restaurantKeyById } from '../utils/redisKeys.js';
import { nanoid } from 'nanoid';
import { successResponse } from '../utils/responses.js';
import { checkRestaurantExists } from '../middlewares/checkRestaurantId.js';
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