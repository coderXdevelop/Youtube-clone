import express from "express";
import {
    toggleChannelSubscription,
    getChannelSubscriptionStatus,
    getUserSubscribedChannels,
    getChannelSubscribers,
} from "../controller/channelSubscriptionController.js";

const router = express.Router();

// Toggle subscribe/unsubscribe
router.post("/subscribe/:channelId", toggleChannelSubscription);
router.post("/toggle/:channelId", toggleChannelSubscription);
router.post("/toggle", toggleChannelSubscription);

// Get subscription status & live subscriber count
router.get("/status/:channelId", getChannelSubscriptionStatus);

// Get channels followed by a user
router.get("/user/:userId", getUserSubscribedChannels);
router.get("/following/:userId", getUserSubscribedChannels);

// Get subscribers of a channel
router.get("/subscribers/:channelId", getChannelSubscribers);

export default router;
