import express from "express";
import {
    getSubscriptionPlans,
    createRazorpayOrder,
    verifySubscriptionPayment,
    getBillingHistory,
    cancelUserSubscription,
} from "../controller/subscriptionController.js";

const router = express.Router();

router.get("/plans", getSubscriptionPlans);
router.post("/create-order", createRazorpayOrder);
router.post("/verify-payment", verifySubscriptionPayment);
router.get("/billing-history/:userId", getBillingHistory);
router.post("/cancel", cancelUserSubscription);

export default router;
