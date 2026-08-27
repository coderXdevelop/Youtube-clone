import mongoose from "mongoose";

const loginOtpChallengeSchema = new mongoose.Schema(
    {
        challengeid: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        userid: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        useremail: {
            type: String,
            required: true,
        },
        otp: {
            type: String,
            required: true,
        },
        reason: {
            type: String,
            default: "New browser, device, or location detected",
        },
        loginmeta: {
            type: Object,
            default: {},
        },
        attempts: {
            type: Number,
            default: 0,
        },
        maxattempts: {
            type: Number,
            default: 5,
        },
        verified: {
            type: Boolean,
            default: false,
        },
        expiresat: {
            type: Date,
            required: true,
            index: { expires: 0 }, // MongoDB TTL index to auto-expire
        },
    },
    {
        timestamps: true,
    }
);

const LoginOtpChallenge = mongoose.model("LoginOtpChallenge", loginOtpChallengeSchema);

export default LoginOtpChallenge;
