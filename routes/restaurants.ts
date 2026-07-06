import express from 'express';
import { RestaurantSchema } from '../schemas/restaurant.js';
import { validate } from '../middlewares/validate.js';
const router = express.Router();

router.get("/", async (req, res) => {
    res.send("Hello world from restaurants route!");
});

router.post("/", validate(RestaurantSchema), async (req, res) => {
    const data = req.body;
    res.send(`Received data: ${JSON.stringify(data)}`);
});

export default router;