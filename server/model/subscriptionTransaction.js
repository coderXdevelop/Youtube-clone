import mongoose from "mongoose";

const subscriptionTransactionSchema = new mongoose.Schema(
    {
        userid: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        username: {
            type: String,
            default: "User",
        },
        useremail: {
            type: String,
            default: "",
        },
        orderid: {
            type: String,
            required: true,
            unique: true,
        },
        paymentid: {
            type: String,
            default: "",
        },
        invoicenumber: {
            type: String,
            required: true,
            unique: true,
        },
        plan: {
            type: String,
            enum: ["Bronze", "Silver", "Gold"],
            required: true,
        },
        billingcycle: {
            type: String,
            enum: ["monthly", "quarterly", "yearly"],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            default: "INR",
        },
        paymentstatus: {
            type: String,
            enum: ["created", "completed", "failed", "cancelled", "refunded"],
            default: "created",
        },
        paymentmethod: {
            type: String,
            default: "Razorpay Test Gateway",
        },
        subscriptionstart: {
            type: Date,
            default: Date.now,
        },
        subscriptionend: {
            type: Date,
            required: true,
        },
        customerdetails: {
            name: { type: String, default: "" },
            email: { type: String, default: "" },
            contact: { type: String, default: "" },
        },
        receiptnotes: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

subscriptionTransactionSchema.index({ userid: 1, createdAt: -1 });

const SubscriptionTransaction = mongoose.model(
    "SubscriptionTransaction",
    subscriptionTransactionSchema
);

export default SubscriptionTransaction;
