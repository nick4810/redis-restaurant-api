import { vi } from "vitest";

/**
 * Creates a fresh mock Redis client whose methods can be overridden per-test.
 * Covers every Redis command used by the routes and middlewares.
 */
export const createMockRedisClient = () => ({
    // Sorted sets
    zRange: vi.fn().mockResolvedValue([]),
    zAdd: vi.fn().mockResolvedValue(1),

    // Hashes
    hGetAll: vi.fn().mockResolvedValue({}),
    hSet: vi.fn().mockResolvedValue(1),
    hGet: vi.fn().mockResolvedValue(null),
    hIncrByFloat: vi.fn().mockResolvedValue(0),

    // Sets
    sAdd: vi.fn().mockResolvedValue(1),
    sMembers: vi.fn().mockResolvedValue([]),

    // Generic
    exists: vi.fn().mockResolvedValue(0),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(0),

    // Lists
    lPush: vi.fn().mockResolvedValue(1),
    lRange: vi.fn().mockResolvedValue([]),
    lRem: vi.fn().mockResolvedValue(0),

    // Bloom filter module
    bf: {
        exists: vi.fn().mockResolvedValue(false),
        add: vi.fn().mockResolvedValue(true),
    },

    // RediSearch module
    ft: {
        search: vi.fn().mockResolvedValue({ total: 0, documents: [] }),
    },

    // RedisJSON module
    json: {
        set: vi.fn().mockResolvedValue("OK"),
        get: vi.fn().mockResolvedValue(null),
    },
});

export type MockRedisClient = ReturnType<typeof createMockRedisClient>;
