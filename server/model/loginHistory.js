import mongoose from "mongoose";

const loginHistorySchema = new mongoose.Schema(
    {
        userid: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        useremail: {
            type: String,
            required: true,
            index: true,
        },
        ipaddress: {
            type: String,
            default: "127.0.0.1",
        },
        browser: {
            type: String,
            default: "Chrome",
        },
        browserversion: {
            type: String,
            default: "",
        },
        os: {
            type: String,
            default: "Windows",
        },
        devicetype: {
            type: String,
            enum: ["Desktop", "Mobile", "Tablet", "Unknown"],
            default: "Desktop",
        },
        devicemodel: {
            type: String,
            default: "",
        },
        deviceid: {
            type: String,
            default: "",
        },
        city: {
            type: String,
            default: "Bengaluru",
        },
        state: {
            type: String,
            default: "Karnataka",
        },
        country: {
            type: String,
            default: "India",
        },
        loc: {
            type: String,
            default: "12.9716,77.5946",
        },
        status: {
            type: String,
            enum: ["success", "otp_required", "otp_failed", "blocked"],
            default: "success",
            index: true,
        },
        autothemeapplied: {
            type: String,
            enum: ["light", "dark"],
            default: "dark",
        },
        istrusteddevice: {
            type: Boolean,
            default: false,
        },
        isnewdevice: {
            type: Boolean,
            default: false,
        },
        isnewlocation: {
            type: Boolean,
            default: false,
        },
        isnewip: {
            type: Boolean,
            default: false,
        },
        failurereason: {
            type: String,
            default: "",
        },
        logintimestamp: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

const LoginHistory = mongoose.model("LoginHistory", loginHistorySchema);

export default LoginHistory;
