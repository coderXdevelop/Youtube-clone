import express from "express";
import {
    getSubscriptionPlans,
    createRazorpayOrder,
    verifySubscriptionPayment,
    getBillingHistory,
    cancelUserSubscription,
} from "../controller/subscriptionController.js";
import { requireAuth, optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/plans", optionalAuth, getSubscriptionPlans);
router.post("/create-order", requireAuth, createRazorpayOrder);
router.post("/verify-payment", requireAuth, verifySubscriptionPayment);
router.get("/billing-history/:userId", optionalAuth, getBillingHistory);
router.post("/cancel", requireAuth, cancelUserSubscription);

export default router;
