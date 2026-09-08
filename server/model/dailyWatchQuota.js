import mongoose from "mongoose";

const dailyWatchQuotaSchema = new mongoose.Schema(
    {
        userid: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        date: {
            type: String, // Format: YYYY-MM-DD in UTC
            required: true,
            index: true,
        },
        watchedseconds: {
            type: Number,
            default: 0,
        },
        lastheartbeat: {
            type: Date,
            default: Date.now,
        },
        sessionids: [
            {
                type: String,
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Compound index to ensure one document per user per day
dailyWatchQuotaSchema.index({ userid: 1, date: 1 }, { unique: true });

const DailyWatchQuota = mongoose.model("DailyWatchQuota", dailyWatchQuotaSchema);

export default DailyWatchQuota;
