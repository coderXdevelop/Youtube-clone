import mongoose from "mongoose";
import users from "../model/user.js";

export const login = async (req, res) => {
    const { email, name, image } = req.body;

    try {
        const existingUser = await users.findOne({ email });

        if (!existingUser) {
            const newUser = await users.create({ email, name, image });
            return res.status(201).json({ result: newUser });
        } else {
            return res.status(200).json({ result: existingUser });
        }
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};

export const updateprofile = async (req, res) => {
    const { id: _id } = req.params;
    const { channelname, description } = req.body;
    if (!mongoose.Types.ObjectId.isValid(_id)) {
        return res.status(500).json({ message: "User unavailable..." });
    }
    try {
        const updatedata = await users.findByIdAndUpdate(
            _id,
            {
                $set: {
                    channelname: channelname,
                    description: description,
                },
            },
            { new: true }
        );
        return res.status(201).json(updatedata);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};

export const getuserprofile = async (req, res) => {
    const { id: _id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(_id)) {
        return res.status(404).json({ message: "Invalid user ID" });
    }
    try {
        const userDoc = await users.findById(_id).select("-__v");
        if (!userDoc) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json(userDoc);
    } catch (error) {
        console.error("getuserprofile error:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};