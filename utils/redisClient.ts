import { createClient, type RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

export const initializeRedisClient = async (): Promise<void> => {
    if(!redisClient) {
        redisClient = createClient();
        redisClient.on('error', (err) => console.error('Redis Client Error', err));
        redisClient.on('connect', () => console.log('Connected to Redis'));
        await redisClient.connect();
    }
};