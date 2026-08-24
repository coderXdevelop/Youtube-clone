import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { connectToDB } from "./model/db.js";
import authRoute from "./routes/authRoute.js";
import videoRoute from "./routes/videoRoute.js";
import commentRoute from "./routes/commentRoute.js";
import likeRoute from "./routes/likeRoute.js";
import historyRoute from "./routes/historyRoute.js";
import watchlaterRoute from "./routes/watchlaterRoute.js";

connectToDB();

const app = express();
const port = process.env.PORT || 5000;

const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
app.use(cors({
    origin: [clientUrl, "http://localhost:3000", "http://127.0.0.1:3000"],
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

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});