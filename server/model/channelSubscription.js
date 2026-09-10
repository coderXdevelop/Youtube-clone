import mongoose from "mongoose";

const channelSubscriptionSchema = new mongoose.Schema(
    {
        channelId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        subscriberId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        subscribedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Compound unique index to prevent duplicate subscriptions and enable fast lookup
channelSubscriptionSchema.index({ channelId: 1, subscriberId: 1 }, { unique: true });
channelSubscriptionSchema.index({ subscriberId: 1 });
channelSubscriptionSchema.index({ channelId: 1 });

const ChannelSubscription = mongoose.model("ChannelSubscription", channelSubscriptionSchema);

export default ChannelSubscription;
