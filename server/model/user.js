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
    avatar: {
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
})

const User = mongoose.model("User", userSchema);

export default User;