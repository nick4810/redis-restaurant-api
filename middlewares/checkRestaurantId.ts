import type { Request, Response, NextFunction } from 'express';
import { initializeRedisClient } from '../utils/redisClient.js';
import { restaurantKeyById } from '../utils/redisKeys.js';
import { errorResponse } from '../utils/responses.js';

export const checkRestaurantExists = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    const { restaurantId } = req.params;
    if(!restaurantId) {
        return errorResponse(res, 400, 'Restaurant ID is required');
    }

    const client = await initializeRedisClient();
    const restaurantKey = restaurantKeyById(restaurantId);
    const exists = await client.exists(restaurantKey);

    if(!exists) {
        return errorResponse(res, 404, `Restaurant with ID ${restaurantId} not found`);
    }

    next();
};