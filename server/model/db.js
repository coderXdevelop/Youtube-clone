import mongoose from "mongoose";
import config from "../config/env.js";

export const connectToDB = async () => {
    try {
        if (!config.mongoUri) {
            throw new Error("MONGODB_URI environment variable is not defined.");
        }
        await mongoose.connect(config.mongoUri);
        console.log("Connected to MongoDB successfully.");
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error.message);
    }
};