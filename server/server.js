import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import config from "./config/env.js";
import { connectToDB } from "./model/db.js";
import User from "./model/user.js";
import authRoute from "./routes/authRoute.js";
import videoRoute from "./routes/videoRoute.js";
import commentRoute from "./routes/commentRoute.js";
import likeRoute from "./routes/likeRoute.js";
import historyRoute from "./routes/historyRoute.js";
import watchlaterRoute from "./routes/watchlaterRoute.js";
import downloadRoute from "./routes/downloadRoute.js";
import subscriptionRoute from "./routes/subscriptionRoute.js";
import paymentRoute from "./routes/paymentRoute.js";
import channelSubscriptionRoute from "./routes/channelSubscriptionRoute.js";
import communityRoute from "./routes/communityRoute.js";
import playlistRoute from "./routes/playlistRoute.js";
import http from "http";
import { Server } from "socket.io";
import meetingRoute from "./routes/meetingRoute.js";
import { setupMeetingSocket } from "./socket/meetingHandler.js";

connectToDB();

const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);

// Security Headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
}));

// Global API Rate Limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500 requests per 15 min window
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    message: { message: "Too many requests from this IP, please try again later." }
});
app.use("/api/", apiLimiter);
app.use("/video", apiLimiter);

// Sensitive Auth / OTP Rate Limiter (Brute-force & email spam prevention)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20, // Max 20 auth/OTP attempts per 15 minutes per IP
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    message: { message: "Too many authentication requests. Please try again in 15 minutes." }
});
app.use("/api/user/login", authLimiter);
app.use("/api/user/verify-login-otp", authLimiter);
app.use("/api/user/resend-login-otp", authLimiter);

const allowedOrigins = Array.from(new Set([
    ...config.frontendUrl.split(",").map((url) => url.trim()).filter(Boolean),
    "https://ytcloneclient.onrender.com",
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
        return callback(new Error("Not allowed by CORS"));
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
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
}, express.static("uploads"));

// Core API Route Mounts
app.use("/api/user", authRoute);
app.use("/api/video", videoRoute);
// Compatibility alias: /video kept for legacy endpoints and external media players
app.use("/video", videoRoute);
app.use("/api/comment", commentRoute);
app.use("/api/like", likeRoute);
app.use("/api/history", historyRoute);
app.use("/api/watch", watchlaterRoute);
app.use("/api/download", downloadRoute);
app.use("/api/subscription", subscriptionRoute);
app.use("/api/channel-subscription", channelSubscriptionRoute);
// Compatibility alias: /api/channel kept for channel subscription shorthands
app.use("/api/channel", channelSubscriptionRoute);
app.use("/api/community", communityRoute);
app.use("/api/playlist", playlistRoute);
app.use("/api/payment", paymentRoute);
app.use("/api/meeting", meetingRoute);

// Automated Subscription Expiry Worker (audits and downgrades expired plans)
const auditExpiredSubscriptions = async () => {
    try {
        const now = new Date();
        const expiredUsers = await User.updateMany(
            {
                subscriptionplan: { $in: ["Bronze", "Silver", "Gold"] },
                subscriptionexpiresat: { $lt: now },
            },
            {
                $set: {
                    subscriptionplan: "Free",
                    subscriptionstatus: "expired",
                },
            }
        );
        if (expiredUsers.modifiedCount > 0) {
            console.log(`[SUBSCRIPTION WORKER] Automatically downgraded ${expiredUsers.modifiedCount} expired subscription(s) to Free plan.`);
        }
    } catch (err) {
        console.warn("[SUBSCRIPTION WORKER] Expiry audit error:", err.message);
    }
};

setInterval(auditExpiredSubscriptions, 15 * 60 * 1000);
auditExpiredSubscriptions();

server.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
});