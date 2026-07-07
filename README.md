# redis-restaurant-api

A REST API for managing restaurants, reviews, and cuisines — built with **Express**, **TypeScript**, and **Redis**. Demonstrates a range of Redis data structures and modules: Hashes, Sorted Sets, Sets, Lists, RedisJSON, RediSearch, and Bloom Filters.

---

## Features

- **Restaurant CRUD** — create restaurants, fetch by ID, search by name, and list paginated by average rating
- **Review system** — add, list, and delete reviews; average rating is recalculated and stored on every submission
- **Cuisine directory** — tag restaurants with cuisines, browse all cuisines, and list restaurants per cuisine
- **Restaurant details** — store rich JSON details (links, contact info) via RedisJSON
- **Weather endpoint** — fetch live weather from [Open-Meteo](https://open-meteo.com/) for a restaurant's coordinates, cached in Redis for 30 minutes
- **Duplicate detection** — Bloom Filter prevents inserting the same `name:location` combination twice
- **Full-text search** — RediSearch index over restaurant names

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM) |
| Language | TypeScript |
| Framework | Express 5 |
| Database | Redis (via `redis` v6 client) |
| Validation | Zod 4 |
| ID generation | nanoid |
| Testing | Vitest + supertest |

---

## Prerequisites

- Node.js 20+
- A Redis instance with the **RedisJSON**, **RediSearch**, and **RedisBloom** modules loaded (e.g. [Redis Stack](https://redis.io/docs/stack/))

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Create a .env file
echo "PORT=3000" > .env

# 3. Initialize Redis data structures (run once)
npx tsx seed/bloomFilter.ts   # creates the Bloom Filter
npx tsx seed/createIndex.ts   # creates the RediSearch index

# 4. Start the development server
npm run dev
```

The server starts on `http://localhost:3000` by default.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with hot-reload (`tsx watch`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled output from `dist/` |
| `npm test` | Run the full test suite (Vitest) |
| `npm run test:watch` | Run tests in watch mode |

---

## API Reference

### Restaurants

| Method | Path | Description |
|---|---|---|
| `GET` | `/restaurants` | List restaurants paginated by rating (`?page=1&limit=10`) |
| `POST` | `/restaurants` | Create a new restaurant |
| `GET` | `/restaurants/search` | Full-text search by name (`?q=<term>`) |
| `GET` | `/restaurants/:id` | Get a single restaurant by ID |
| `POST` | `/restaurants/:id/details` | Store JSON details (links, contact) |
| `GET` | `/restaurants/:id/details` | Retrieve JSON details |
| `GET` | `/restaurants/:id/weather` | Get current weather (cached 30 min) |
| `POST` | `/restaurants/:id/reviews` | Add a review |
| `GET` | `/restaurants/:id/reviews` | List reviews paginated (`?page=1&limit=10`) |
| `DELETE` | `/restaurants/:id/reviews/:reviewId` | Delete a review |

#### POST `/restaurants` — request body

```json
{
  "name": "Pasta Palace",
  "location": "47.6062,-122.3321",
  "cuisines": ["Italian"]
}
```

#### POST `/restaurants/:id/reviews` — request body

```json
{
  "review": "Absolutely outstanding.",
  "rating": 5
}
```

#### POST `/restaurants/:id/details` — request body

```json
{
  "links": [{ "name": "Menu", "url": "https://example.com/menu" }],
  "contact": { "phone": "+1-555-0100", "email": "info@example.com" }
}
```

### Cuisines

| Method | Path | Description |
|---|---|---|
| `GET` | `/cuisines` | List all distinct cuisine types |
| `GET` | `/cuisines/:cuisine` | List restaurant names for a cuisine |

---

## Redis Data Model

| Key pattern | Type | Contents |
|---|---|---|
| `urn:key:restaurants:<id>` | Hash | `id`, `name`, `location`, `totalRating`, `averageRating` |
| `urn:key:restaurants_by_rating` | Sorted Set | Restaurant IDs scored by average rating |
| `urn:key:cuisines` | Set | All distinct cuisine names |
| `urn:key:cuisines:<name>` | Set | Restaurant IDs tagged with that cuisine |
| `urn:key:restaurant_cuisines:<id>` | Set | Cuisines for a specific restaurant |
| `urn:key:restaurant_details:<id>` | JSON | Links and contact info |
| `urn:key:reviews:<id>` | List | Ordered review IDs for a restaurant |
| `urn:key:review-details:<reviewId>` | Hash | Review text, rating, timestamp, restaurantId |
| `urn:key:weather:<id>` | String | Cached weather JSON (TTL 1800 s) |
| `urn:key:restaurant_bloom:restaurants` | Bloom Filter | Duplicate detection by `name:location` |
| `urn:key:restaurant_index:restaurants` | Search Index | Full-text index over restaurant Hashes |

---

## Project Structure

```
.
├── app.ts                   # Express app factory (no listen — importable by tests)
├── index.ts                 # Entry point — calls app.listen()
├── middlewares/
│   ├── checkRestaurantId.ts # 404 guard for :restaurantId routes
│   ├── errorHandler.ts      # Global error handler
│   └── validate.ts          # Zod request body validation
├── routes/
│   ├── cuisines.ts
│   └── restaurants.ts
├── schemas/
│   ├── restaurant.ts        # Zod schemas + TypeScript types
│   └── review.ts
├── seed/
│   ├── bloomFilter.ts       # One-time Bloom Filter setup
│   └── createIndex.ts       # One-time RediSearch index setup
├── tests/
│   ├── helpers/
│   │   └── mockRedisClient.ts
│   ├── integration/
│   │   ├── cuisines.test.ts
│   │   └── restaurants.test.ts
│   └── unit/
│       ├── errorHandler.test.ts
│       ├── redisKeys.test.ts
│       ├── responses.test.ts
│       ├── schemas.test.ts
│       └── validate.test.ts
├── utils/
│   ├── redisClient.ts       # Singleton Redis client
│   ├── redisKeys.ts         # URN key builder functions
│   └── responses.ts         # Typed success/error response helpers
└── vitest.config.ts
```

---

## Testing

The test suite uses **Vitest** and **supertest**. Integration tests mock `initializeRedisClient` via `vi.mock` — no running Redis instance required.

```bash
npm test          # single run
npm run test:watch  # watch mode
```

**Coverage areas:**

- Unit: Zod schemas, Redis key builders, response helpers, `validate` middleware, `errorHandler`
- Integration: all restaurant and cuisine HTTP routes with a mocked Redis client

