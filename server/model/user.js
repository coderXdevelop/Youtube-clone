import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    channelname: {
        type: String,
        required: true
    },
    discription: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        required: true
    },
    joinedon: {
        type: Date,
        default: Date.now
    },

})

const User = mongoose.model("User", userSchema);

export default User;