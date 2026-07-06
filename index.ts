import express from "express";

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}).on("error", (err) => {
    throw new Error(`Failed to start server: ${err.message}`);
});
