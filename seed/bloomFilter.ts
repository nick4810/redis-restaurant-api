import { initializeRedisClient } from "../utils/redisClient.js";
import { restaurantBloomKey } from "../utils/redisKeys.js";

const createRestaurantBloomFilter = async () => {
    const client = await initializeRedisClient();
    await Promise.all([
        client.del(restaurantBloomKey), // Delete the existing Bloom filter if it exists
        client.bf.reserve(restaurantBloomKey, 0.0001, 1_000_000) // Create a new Bloom filter with a 0.01% false positive rate and capacity for 1,000,000 items
    ]);
};

await createRestaurantBloomFilter();
process.exit();