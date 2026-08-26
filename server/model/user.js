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
    registereddevices: [
        {
            deviceid: { type: String },
            devicename: { type: String, default: "Default Device" },
            registeredat: { type: Date, default: Date.now }
        }
    ]
})

const User = mongoose.model("User", userSchema);

export default User;