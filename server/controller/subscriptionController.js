import mongoose from "mongoose";
import User from "../model/user.js";
import SubscriptionTransaction from "../model/subscriptionTransaction.js";

// Comprehensive Plan Definitions with features and pricing
export const SUBSCRIPTION_PLANS = {
    Free: {
        name: "Free",
        tagline: "Basic streaming & viewing",
        pricing: {
            monthly: 0,
            quarterly: 0,
            yearly: 0,
        },
        downloadsPerDay: 1,
        maxQuality: "720p HD",
        adFree: false,
        priorityAccess: false,
        exclusiveCourses: false,
        maxDevices: 1,
        features: [
            "1 video download per day",
            "Streaming up to 720p HD",
            "Standard video loading speed",
            "Standard ad experience",
            "1 registered device",
            "24h free re-downloads",
        ],
    },
    Bronze: {
        name: "Bronze",
        tagline: "Essential ad-free viewing & higher downloads",
        popular: false,
        pricing: {
            monthly: 199,
            quarterly: 499, // save ~16%
            yearly: 1799,   // save ~25%
        },
        downloadsPerDay: 5,
        maxQuality: "1080p Full HD",
        adFree: true,
        priorityAccess: false,
        exclusiveCourses: false,
        maxDevices: 2,
        features: [
            "5 video downloads per day",
            "1080p Full HD streaming",
            "100% Ad-Free viewing experience",
            "Faster buffering & CDN speed",
            "Up to 2 registered devices",
            "Priority video playback",
            "24h free re-downloads",
        ],
    },
    Silver: {
        name: "Silver",
        tagline: "Pro creator & learning powerhouse",
        popular: true,
        pricing: {
            monthly: 399,
            quarterly: 999, // save ~17%
            yearly: 3499,   // save ~27%
        },
        downloadsPerDay: 15,
        maxQuality: "1440p 2K QHD",
        adFree: true,
        priorityAccess: true,
        exclusiveCourses: true,
        maxDevices: 4,
        features: [
            "15 video downloads per day",
            "2K 1440p Quad HD streaming",
            "100% Ad-Free experience",
            "Exclusive Premium Courses access",
            "Priority Content access",
            "Up to 4 registered devices",
            "Offline downloads & background audio",
            "24h free re-downloads",
        ],
    },
    Gold: {
        name: "Gold",
        tagline: "Ultimate VIP unlimited experience",
        popular: false,
        pricing: {
            monthly: 699,
            quarterly: 1799, // save ~14%
            yearly: 5999,    // save ~28%
        },
        downloadsPerDay: 50,
        maxQuality: "4K Ultra HD + HDR",
        adFree: true,
        priorityAccess: true,
        exclusiveCourses: true,
        maxDevices: 999,
        features: [
            "Unlimited downloads (50 / day)",
            "4K Ultra HD + HDR streaming",
            "100% Ad-Free experience",
            "Full access to all VIP courses & series",
            "Highest streaming priority on CDN",
            "Unlimited device registrations",
            "Early access to new creator releases",
            "VIP 24/7 dedicated support",
            "24h free re-downloads",
        ],
    },
};

/**
 * Helper to compute expiry date based on cycle
 */
const computeExpiryDate = (cycle) => {
    const d = new Date();
    if (cycle === "quarterly") {
        d.setMonth(d.getMonth() + 3);
    } else if (cycle === "yearly") {
        d.setFullYear(d.getFullYear() + 1);
    } else {
        // default monthly
        d.setMonth(d.getMonth() + 1);
    }
    return d;
};

/**
 * GET /api/subscription/plans?userId=...
 * Fetch all plans, feature matrix, and current user active subscription
 */
export const getSubscriptionPlans = async (req, res) => {
    const { userId } = req.query;

    try {
        let userSubscription = {
            plan: "Free",
            billingcycle: "none",
            status: "active",
            expiresAt: null,
            isExpired: false,
            daysRemaining: 0,
        };

        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            const userDoc = await User.findById(userId);
            if (userDoc) {
                const plan = userDoc.subscriptionplan || "Free";
                const expiresAt = userDoc.subscriptionexpiresat;
                const isExpired = Boolean(expiresAt && new Date(expiresAt) < new Date());

                let daysRemaining = 0;
                if (expiresAt && !isExpired) {
                    const diffTime = new Date(expiresAt).getTime() - new Date().getTime();
                    daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                }

                userSubscription = {
                    plan: isExpired ? "Free" : plan,
                    billingcycle: userDoc.subscriptionbillingcycle || "none",
                    status: isExpired ? "expired" : (userDoc.subscriptionstatus || "active"),
                    expiresAt: userDoc.subscriptionexpiresat,
                    startDate: userDoc.subscriptionstartdate,
                    lastInvoice: userDoc.lastinvoicenumber,
                    isExpired,
                    daysRemaining,
                };
            }
        }

        return res.status(200).json({
            plans: SUBSCRIPTION_PLANS,
            userSubscription,
            razorpayKeyId: process.env.API_KEY || process.env.RAZORPAY_KEY_ID || "rzp_test_TUHrKogGVX5LaU",
        });
    } catch (error) {
        console.error("getSubscriptionPlans error:", error);
        return res.status(500).json({ message: "Failed to fetch subscription plans." });
    }
};

/**
 * POST /api/subscription/create-order
 * Create a new Razorpay Test Order and initiate transaction
 */
export const createRazorpayOrder = async (req, res) => {
    const { userId, plan, billingcycle = "monthly" } = req.body;

    if (!userId || !plan) {
        return res.status(400).json({ message: "User ID and Plan are required." });
    }

    if (!SUBSCRIPTION_PLANS[plan] || plan === "Free") {
        return res.status(400).json({ message: "Invalid paid subscription plan selected." });
    }

    try {
        const userDoc = await User.findById(userId);
        if (!userDoc) {
            return res.status(404).json({ message: "User not found." });
        }

        const planConfig = SUBSCRIPTION_PLANS[plan];
        const amount = planConfig.pricing[billingcycle] || planConfig.pricing.monthly;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Invalid pricing for selected cycle." });
        }

        const timestamp = Date.now();
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        const orderId = `order_rzp_${timestamp}_${randomNum}`;
        const invoiceNumber = `INV-${new Date().getFullYear()}-${randomNum}`;
        const subscriptionEnd = computeExpiryDate(billingcycle);

        // Store initial transaction log in DB
        const transaction = await SubscriptionTransaction.create({
            userid: userId,
            username: userDoc.name || "Subscriber",
            useremail: userDoc.email || "",
            orderid: orderId,
            invoicenumber: invoiceNumber,
            plan,
            billingcycle,
            amount,
            currency: "INR",
            paymentstatus: "created",
            subscriptionstart: new Date(),
            subscriptionend: subscriptionEnd,
            customerdetails: {
                name: userDoc.name || "Subscriber",
                email: userDoc.email || "",
            },
        });

        const keyId = process.env.API_KEY || process.env.RAZORPAY_KEY_ID || "rzp_test_TUHrKogGVX5LaU";

        return res.status(200).json({
            success: true,
            orderId,
            invoiceNumber,
            amount,
            amountInPaise: amount * 100,
            currency: "INR",
            plan,
            billingcycle,
            keyId,
            user: {
                name: userDoc.name,
                email: userDoc.email,
            },
        });
    } catch (error) {
        console.error("createRazorpayOrder error:", error);
        return res.status(500).json({ message: "Failed to initialize payment order." });
    }
};

/**
 * POST /api/subscription/verify-payment
 * Verify payment, activate subscription, update user profile, and return invoice
 */
export const verifySubscriptionPayment = async (req, res) => {
    const {
        userId,
        orderId,
        paymentId,
        paymentStatus = "completed",
        paymentMethod = "Razorpay Test Gateway",
    } = req.body;

    if (!userId || !orderId) {
        return res.status(400).json({ message: "Missing verification parameters." });
    }

    try {
        const transaction = await SubscriptionTransaction.findOne({ orderid: orderId });
        if (!transaction) {
            return res.status(404).json({ message: "Transaction record not found." });
        }

        if (paymentStatus === "cancelled" || paymentStatus === "failed") {
            transaction.paymentstatus = paymentStatus;
            transaction.paymentid = paymentId || "FAILED_OR_CANCELLED";
            await transaction.save();

            return res.status(400).json({
                success: false,
                message: `Payment was ${paymentStatus}. No charges were processed.`,
            });
        }

        const generatedPaymentId = paymentId || `pay_rzp_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

        // Update transaction to completed
        transaction.paymentstatus = "completed";
        transaction.paymentid = generatedPaymentId;
        transaction.paymentmethod = paymentMethod;
        await transaction.save();

        // Update user's active subscription in MongoDB
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    subscriptionplan: transaction.plan,
                    subscriptionbillingcycle: transaction.billingcycle,
                    subscriptionstartdate: transaction.subscriptionstart,
                    subscriptionexpiresat: transaction.subscriptionend,
                    subscriptionstatus: "active",
                    lastinvoicenumber: transaction.invoicenumber,
                },
            },
            { new: true }
        );

        // Build invoice receipt payload
        const invoiceReceipt = {
            invoiceNumber: transaction.invoicenumber,
            orderId: transaction.orderid,
            paymentId: generatedPaymentId,
            date: transaction.subscriptionstart,
            plan: transaction.plan,
            billingcycle: transaction.billingcycle,
            amount: transaction.amount,
            currency: transaction.currency,
            customerName: transaction.username,
            customerEmail: transaction.useremail,
            validUntil: transaction.subscriptionend,
            paymentMethod: transaction.paymentmethod,
            status: "PAID",
        };

        return res.status(200).json({
            success: true,
            message: `Congratulations! Your ${transaction.plan} Plan is now active.`,
            user: {
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                subscriptionplan: updatedUser.subscriptionplan,
                subscriptionbillingcycle: updatedUser.subscriptionbillingcycle,
                subscriptionexpiresat: updatedUser.subscriptionexpiresat,
                subscriptionstatus: updatedUser.subscriptionstatus,
            },
            invoice: invoiceReceipt,
        });
    } catch (error) {
        console.error("verifySubscriptionPayment error:", error);
        return res.status(500).json({ message: "Failed to verify and activate subscription." });
    }
};

/**
 * GET /api/subscription/billing-history/:userId
 * Retrieve past invoices and billing history for a user
 */
export const getBillingHistory = async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid user ID." });
    }

    try {
        const transactions = await SubscriptionTransaction.find({
            userid: userId,
            paymentstatus: "completed",
        })
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json(transactions);
    } catch (error) {
        console.error("getBillingHistory error:", error);
        return res.status(500).json({ message: "Failed to fetch billing history." });
    }
};

/**
 * POST /api/subscription/cancel
 * Cancel active subscription (preserves access until current period expires)
 */
export const cancelUserSubscription = async (req, res) => {
    const { userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid user ID." });
    }

    try {
        const userDoc = await User.findById(userId);
        if (!userDoc) {
            return res.status(404).json({ message: "User not found." });
        }

        userDoc.subscriptionstatus = "cancelled";
        await userDoc.save();

        return res.status(200).json({
            success: true,
            message: "Subscription cancelled successfully. You will retain full access until your current billing period ends.",
            subscriptionexpiresat: userDoc.subscriptionexpiresat,
        });
    } catch (error) {
        console.error("cancelUserSubscription error:", error);
        return res.status(500).json({ message: "Failed to cancel subscription." });
    }
};
