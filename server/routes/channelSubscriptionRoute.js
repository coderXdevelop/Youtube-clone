import express from "express";
import {
    toggleChannelSubscription,
    getChannelSubscriptionStatus,
    getUserSubscribedChannels,
    getChannelSubscribers,
} from "../controller/channelSubscriptionController.js";

import { requireAuth, optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Toggle subscribe/unsubscribe
router.post("/subscribe/:channelId", requireAuth, toggleChannelSubscription);
router.post("/toggle/:channelId", requireAuth, toggleChannelSubscription);
router.post("/toggle", requireAuth, toggleChannelSubscription);

// Get subscription status & live subscriber count
router.get("/status/:channelId", optionalAuth, getChannelSubscriptionStatus);

// Get channels followed by a user
router.get("/user/:userId", optionalAuth, getUserSubscribedChannels);
router.get("/following/:userId", optionalAuth, getUserSubscribedChannels);

// Get subscribers of a channel
router.get("/subscribers/:channelId", getChannelSubscribers);

export default router;
