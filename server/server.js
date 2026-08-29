import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import config from "./config/env.js";
import { connectToDB } from "./model/db.js";
import authRoute from "./routes/authRoute.js";
import videoRoute from "./routes/videoRoute.js";
import commentRoute from "./routes/commentRoute.js";
import likeRoute from "./routes/likeRoute.js";
import historyRoute from "./routes/historyRoute.js";
import watchlaterRoute from "./routes/watchlaterRoute.js";
import downloadRoute from "./routes/downloadRoute.js";
import subscriptionRoute from "./routes/subscriptionRoute.js";
import paymentRoute from "./routes/paymentRoute.js";

connectToDB();

const app = express();

const allowedOrigins = Array.from(new Set([
    ...config.frontendUrl.split(",").map((url) => url.trim()).filter(Boolean),
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]));

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json());
app.use(bodyParser.json({ limit: "50mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", express.static("uploads"));

app.use("/api/user", authRoute);
app.use("/api/video", videoRoute);
app.use("/api/comment", commentRoute);
app.use("/api/like", likeRoute);
app.use("/api/history", historyRoute);
app.use("/api/watch", watchlaterRoute);
app.use("/api/download", downloadRoute);
app.use("/api/subscription", subscriptionRoute);
app.use("/api/payment", paymentRoute);
app.use("/api", paymentRoute);

app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
});