import mongoose from "mongoose";
import ChannelSubscription from "../model/channelSubscription.js";
import User from "../model/user.js";

/**
 * Toggle Subscribe / Unsubscribe to a creator's channel
 */
export const toggleChannelSubscription = async (req, res) => {
    try {
        const channelId = req.params.channelId || req.body.channelId;
        const subscriberId = req.body.subscriberId || req.body.userId || req.headers["x-user-id"];

        if (!channelId || !subscriberId) {
            return res.status(400).json({
                success: false,
                message: "channelId and subscriberId are required.",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(channelId) || !mongoose.Types.ObjectId.isValid(subscriberId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid channel or subscriber ID format.",
            });
        }

        if (channelId.toString() === subscriberId.toString()) {
            return res.status(400).json({
                success: false,
                message: "Users cannot subscribe to their own channel.",
            });
        }

        // Verify target channel user exists
        const channelUser = await User.findById(channelId);
        if (!channelUser) {
            return res.status(404).json({
                success: false,
                message: "Channel does not exist.",
            });
        }

        // Check if subscription already exists
        const existingSub = await ChannelSubscription.findOne({
            channelId,
            subscriberId,
        });

        let isSubscribed = false;
        let message = "";

        if (existingSub) {
            // Unsubscribe
            await ChannelSubscription.findByIdAndDelete(existingSub._id);
            await User.findByIdAndUpdate(channelId, {
                $inc: { subscribersCount: -1 },
            });
            isSubscribed = false;
            message = `Unsubscribed from ${channelUser.channelname || channelUser.name || "channel"}.`;
        } else {
            // Subscribe
            await ChannelSubscription.create({
                channelId,
                subscriberId,
            });
            await User.findByIdAndUpdate(channelId, {
                $inc: { subscribersCount: 1 },
            });
            isSubscribed = true;
            message = `Subscribed to ${channelUser.channelname || channelUser.name || "channel"}!`;
        }

        // Get accurate real-time count from collection
        const totalSubscribers = await ChannelSubscription.countDocuments({ channelId });

        // Synchronize counter on user document if out of sync
        if (channelUser.subscribersCount !== totalSubscribers) {
            await User.findByIdAndUpdate(channelId, {
                $set: { subscribersCount: Math.max(0, totalSubscribers) },
            });
        }

        return res.status(200).json({
            success: true,
            isSubscribed,
            subscriberCount: totalSubscribers,
            message,
        });
    } catch (error) {
        console.error("toggleChannelSubscription error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update channel subscription.",
        });
    }
};

/**
 * Get Channel Subscription status for a user & channel's live subscriber count
 */
export const getChannelSubscriptionStatus = async (req, res) => {
    try {
        const { channelId } = req.params;
        const userId = req.query.userId || req.headers["x-user-id"];

        if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid channel ID.",
            });
        }

        const totalSubscribers = await ChannelSubscription.countDocuments({ channelId });

        let isSubscribed = false;
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            const sub = await ChannelSubscription.exists({
                channelId,
                subscriberId: userId,
            });
            isSubscribed = Boolean(sub);
        }

        return res.status(200).json({
            success: true,
            channelId,
            subscriberCount: totalSubscribers,
            isSubscribed,
        });
    } catch (error) {
        console.error("getChannelSubscriptionStatus error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch channel subscription status.",
        });
    }
};

/**
 * Get all channels a user is subscribed to (user's followed channels)
 */
export const getUserSubscribedChannels = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID.",
            });
        }

        const subscriptions = await ChannelSubscription.find({ subscriberId: userId })
            .populate({
                path: "channelId",
                select: "name channelname image discription email subscribersCount joinedon",
            })
            .sort({ createdAt: -1 })
            .lean();

        // Format clean response list
        const channels = subscriptions
            .filter((sub) => sub.channelId) // Filter out any deleted users
            .map((sub) => ({
                subscriptionId: sub._id,
                subscribedAt: sub.subscribedAt || sub.createdAt,
                channel: sub.channelId,
            }));

        return res.status(200).json({
            success: true,
            count: channels.length,
            channels,
        });
    } catch (error) {
        console.error("getUserSubscribedChannels error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch subscribed channels.",
        });
    }
};

/**
 * Get all subscribers of a channel (for creator dashboard or profile)
 */
export const getChannelSubscribers = async (req, res) => {
    try {
        const { channelId } = req.params;

        if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid channel ID.",
            });
        }

        const subscribers = await ChannelSubscription.find({ channelId })
            .populate({
                path: "subscriberId",
                select: "name channelname image email joinedon",
            })
            .sort({ createdAt: -1 })
            .lean();

        const cleanList = subscribers
            .filter((sub) => sub.subscriberId)
            .map((sub) => ({
                subscriptionId: sub._id,
                subscribedAt: sub.subscribedAt || sub.createdAt,
                subscriber: sub.subscriberId,
            }));

        return res.status(200).json({
            success: true,
            totalSubscribers: cleanList.length,
            subscribers: cleanList,
        });
    } catch (error) {
        console.error("getChannelSubscribers error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch channel subscribers.",
        });
    }
};
