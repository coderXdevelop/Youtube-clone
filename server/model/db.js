import mongoose from "mongoose";

export const connectToDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error("MONGODB_URI environment variable is not defined.");
        }
        await mongoose.connect(uri);
        console.log("Connected to MongoDB successfully.");
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error.message);
    }
};