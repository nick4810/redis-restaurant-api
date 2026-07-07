import express, { type Request } from 'express';
import { RestaurantDetailsSchema, RestaurantSchema, type RestaurantDetails } from '../schemas/restaurant.js';
import { validate } from '../middlewares/validate.js';
import { initializeRedisClient } from '../utils/redisClient.js';
import { cuisineKey, cuisinesKey, restaurantBloomKey, restaurantCuisinesKeyById, restaurantDetailsKeyById, restaurantIndexKey, restaurantKeyById, restaurantsByRatingKey, reviewDetailsKeyById, reviewKeyById, weatherKeyByRestaurantId } from '../utils/redisKeys.js';
import { nanoid } from 'nanoid';
import { errorResponse, successResponse } from '../utils/responses.js';
import { checkRestaurantExists } from '../middlewares/checkRestaurantId.js';
import { ReviewSchema, type Review } from '../schemas/review.js';
const router = express.Router();

router.get("/", async (req, res, next) => {
    const { page = 1, limit = 10 } = req.query;
    const start = (Number(page) - 1) * Number(limit);
    const end = start + Number(limit) - 1;

    try { 
        const client = await initializeRedisClient();
        const restaurantIds = await client.zRange(restaurantsByRatingKey, start, end, { REV: true });
        const restaurants = await Promise.all(
            restaurantIds.map((id => client.hGetAll(restaurantKeyById(id)))
        ));
        return successResponse(res, restaurants, "Fetched restaurants successfully");
    } catch (error) {
        next(error); // Pass the error to the error handling middleware
    }
});

router.post("/", validate(RestaurantSchema), async (req, res, next) => {
    const data = req.body;
    try {
        const client = await initializeRedisClient();
        const id = nanoid(); // Generate a unique ID for the restaurant
        const restaurantKey = restaurantKeyById(id);
        const bloomString = `${data.name}:${data.location}`;
        const seen = await client.bf.exists(restaurantBloomKey, bloomString);
        if(seen) {
            return errorResponse(res, 409, "Restaurant already exists");
        }

        const hashData = {
            id, name: data.name, location: data.location 
        };
        await Promise.all([
            ...data.cuisines.map((cuisine: string) => Promise.all([
                client.sAdd(cuisinesKey, cuisine), // Add cuisine to the global cuisines set
                client.sAdd(cuisineKey(cuisine), id), // Add restaurant ID to the cuisine's set
                client.sAdd(restaurantCuisinesKeyById(id), cuisine) // Add cuisine to the restaurant's cuisines set
            ])),
            client.hSet(restaurantKey, hashData),
            client.zAdd(restaurantsByRatingKey, { score: 0, value: id }), // Add restaurant ID to the sorted set with an initial score of 0
            client.bf.add(restaurantBloomKey, bloomString) // Add the restaurant to the Bloom filter
        ]);
        return successResponse(res, hashData, "Added new restaurant successfully");
    } catch (error) {
        next(error); // Pass the error to the error handling middleware
    }

    res.send(`Received data: ${JSON.stringify(data)}`);
});

router.get("/search", async (req, res, next) => {
    const { q } = req.query;
    try {
        const client = await initializeRedisClient();
        const results = await client.ft.search(restaurantIndexKey, `@name:${q}*`);
        return successResponse(res, results, "Fetched search results successfully");
    } catch (error) {
        next(error); // Pass the error to the error handling middleware
    }
});

router.post("/:restaurantId/details", checkRestaurantExists, validate(RestaurantDetailsSchema), async (req: Request<{ restaurantId: string }>, res, next) => {
    const { restaurantId } = req.params;
    const data = req.body as RestaurantDetails;
    try {
        const client = await initializeRedisClient();
        const restaurantDetailsKey = restaurantDetailsKeyById(restaurantId);
        await client.json.set(restaurantDetailsKey, ".", data);
        return successResponse(res, {}, "Added restaurant details successfully");
    } catch (error) {
        next(error); // Pass the error to the error handling middleware
    }
});

router.get("/:restaurantId/details", checkRestaurantExists, async (req: Request<{ restaurantId: string }>, res, next) => {
    const { restaurantId } = req.params;
    try {
        const client = await initializeRedisClient();
        const restaurantDetailsKey = restaurantDetailsKeyById(restaurantId);
        const data = await client.json.get(restaurantDetailsKey);
        return successResponse(res, data, "Fetched restaurant details successfully");
    } catch (error) {
        next(error); // Pass the error to the error handling middleware
    }
});


router.get("/:restaurantId/weather", checkRestaurantExists, async (req: Request<{ restaurantId: string }>, res, next) => {
    const { restaurantId } = req.params;
    try {
        const client = await initializeRedisClient();
        const weatherKey = weatherKeyByRestaurantId(restaurantId);
        const cachedWeatherData = await client.get(weatherKey);
        if(cachedWeatherData) {
            return successResponse(res, JSON.parse(cachedWeatherData), "Fetched weather data from cache");
        }

        const restaurantKey = restaurantKeyById(restaurantId);
        const coordinates = await client.hGet(restaurantKey, 'location');
        if(!coordinates) {
            return errorResponse(res, 404, `Coordinates not found for restaurant ${restaurantId}`);
        }

        const [lat, lon] = coordinates.split(',').map(Number);
        const apiResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        if(apiResponse.status === 200) {
            const weatherData = await apiResponse.json();
            await client.set(weatherKey, JSON.stringify(weatherData), { EX: 1800 }); // Cache for 30 minutes
            return successResponse(res, weatherData, "Fetched weather data successfully");
        }
        return errorResponse(res, apiResponse.status, `Failed to fetch weather data: ${apiResponse.statusText}`);
    } catch (error) {
        next(error); // Pass the error to the error handling middleware
    }
});

router.post("/:restaurantId/reviews", checkRestaurantExists, validate(ReviewSchema), async (req: Request<{restaurantId: string}>, res, next) => {
    const { restaurantId } = req.params;
    const data = req.body as Review;
    try {
        const client = await initializeRedisClient();
        const reviewId = nanoid();
        const reviewKey = reviewKeyById(restaurantId);
        const reviewDetailsKey = reviewDetailsKeyById(reviewId);
        const restaurantKey = restaurantKeyById(restaurantId);
        const reviewData = {
            id: reviewId,
            ...data,
            timestamp: Date.now(),
            restaurantId,
        };
        const [reviewCount, setResult, totalRating] = await Promise.all([
            client.lPush(reviewKey, reviewId), // Store the review ID in the restaurant's review list
            client.hSet(reviewDetailsKey, reviewData), // Store the review details in a hash,
            client.hIncrByFloat(restaurantKey, "totalRating", data.rating), // Increment the total rating for the restaurant
        ]);

        const averageRating = Number((totalRating / reviewCount).toFixed(1));
        await Promise.all([
            client.zAdd(restaurantsByRatingKey, { score: averageRating, value: restaurantId }), // Update the restaurant's score in the sorted set
            client.hSet(restaurantKey, "averageRating", averageRating.toString()), // Update the average rating in the restaurant's hash
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
        const [viewCount, restaurantData, restaurantCuisines] = await Promise.all([
            client.hIncrBy(restaurantKey, 'viewCount', 1), 
            client.hGetAll(restaurantKey),
            client.sMembers(restaurantCuisinesKeyById(restaurantId))
        ]);
        return successResponse(res, { ...restaurantData, cuisines: restaurantCuisines }, "Fetched restaurant successfully");
    } catch (error) {
        next(error); // Pass the error to the error handling middleware
    }
});

export default router;