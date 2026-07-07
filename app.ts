import express from "express";
import restaurantsRouter from "./routes/restaurants.js";
import cuisinesRouter from "./routes/cuisines.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

app.use(express.json());
app.use("/restaurants", restaurantsRouter);
app.use("/cuisines", cuisinesRouter);
app.use(errorHandler);

export default app;
