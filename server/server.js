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

import http from "http";
import { Server } from "socket.io";
import meetingRoute from "./routes/meetingRoute.js";
import { setupMeetingSocket } from "./socket/meetingHandler.js";

connectToDB();

const app = express();
app.set("trust proxy", true);
const server = http.createServer(app);

const allowedOrigins = Array.from(new Set([
    ...config.frontendUrl.split(",").map((url) => url.trim()).filter(Boolean),
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
]));

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
            allowedOrigins.includes(origin) ||
            origin.startsWith("http://localhost:") ||
            origin.startsWith("http://127.0.0.1:")
        ) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "Range",
        "x-user-id",
        "x-requested-with",
        "Accept",
        "Origin",
    ],
    exposedHeaders: [
        "Content-Range",
        "Accept-Ranges",
        "Content-Length",
        "Content-Type",
        "X-Authorized-Quality",
        "X-User-Plan",
    ],
};

const io = new Server(server, {
    cors: corsOptions
});

setupMeetingSocket(io);

app.use(cors(corsOptions));
app.use(express.json());
app.use(bodyParser.json({ limit: "50mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
}, express.static("uploads"));

app.use("/api/user", authRoute);
app.use("/api/video", videoRoute);
app.use("/api/comment", commentRoute);
app.use("/api/like", likeRoute);
app.use("/api/history", historyRoute);
app.use("/api/watch", watchlaterRoute);
app.use("/api/download", downloadRoute);
app.use("/api/subscription", subscriptionRoute);
app.use("/api/payment", paymentRoute);
app.use("/api/meeting", meetingRoute);
app.use("/api", paymentRoute);

server.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
});