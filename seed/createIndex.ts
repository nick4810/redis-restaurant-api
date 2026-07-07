import { initializeRedisClient } from "../utils/redisClient.js";
import { restaurantIndexKey, getKeyName } from "../utils/redisKeys.js";

const createIndex = async () => {
    const client = await initializeRedisClient();

    try {
        await client.ft.dropIndex(restaurantIndexKey);
    } catch (error) {
        console.log("Index does not exist, creating a new one...");
    }

    await client.ft.create(restaurantIndexKey, 
        {
            id: {
                type: 'TEXT',
                AS: "id",
            },
            name: {
                type: 'TEXT',
                AS: "name",
            }, 
            averageRating: {
                type: 'NUMERIC',
                AS: "averageRating",
                SORTABLE: true,
            }
        }, 
        {
            ON: "HASH",
            PREFIX: getKeyName("restaurants")
        }
    );
};

await createIndex();
process.exit();