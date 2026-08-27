import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    channelname: {
        type: String,
        default: ""
    },
    discription: {
        type: String,
        default: ""
    },
    image: {
        type: String,
        default: ""
    },
    joinedon: {
        type: Date,
        default: Date.now
    },
    // Theme Preference: "auto" (IST time based), "light", or "dark"
    themepreference: {
        type: String,
        enum: ["auto", "light", "dark"],
        default: "auto"
    },
    lastlogintheme: {
        type: String,
        default: "dark"
    },
    lastloginat: {
        type: Date,
        default: Date.now
    },
    // Subscription Information
    subscriptionplan: {
        type: String,
        enum: ["Free", "Bronze", "Silver", "Gold"],
        default: "Free"
    },
    subscriptionbillingcycle: {
        type: String,
        enum: ["none", "monthly", "quarterly", "yearly"],
        default: "none"
    },
    subscriptionstartdate: {
        type: Date,
        default: null
    },
    subscriptionexpiresat: {
        type: Date,
        default: null
    },
    subscriptionstatus: {
        type: String,
        enum: ["none", "active", "cancelled", "expired"],
        default: "none"
    },
    lastinvoicenumber: {
        type: String,
        default: ""
    },
    // Registered / Trusted Devices for Security & OTP verification
    registereddevices: [
        {
            deviceid: { type: String, required: true },
            devicename: { type: String, default: "Default Device" },
            browser: { type: String, default: "Unknown Browser" },
            browserversion: { type: String, default: "" },
            os: { type: String, default: "Unknown OS" },
            devicetype: { type: String, default: "Desktop" },
            devicemodel: { type: String, default: "" },
            ipaddress: { type: String, default: "" },
            city: { type: String, default: "" },
            state: { type: String, default: "" },
            country: { type: String, default: "" },
            location: { type: String, default: "" },
            trustedat: { type: Date, default: Date.now },
            expiresat: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }, // 30 days
            lastactive: { type: Date, default: Date.now }
        }
    ]
});

const User = mongoose.model("User", userSchema);

export default User;