import User from "../model/user.js";

export const login = async (req, res) => {
    try {
        const { email, name, image, avatar } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email is required for authentication" });
        }
        const profilePic = image || avatar || "https://github.com/shadcn.png";
        const userName = name || email.split("@")[0] || "User";
        
        let user = await User.findOne({ email });
        if (!user) {
            user = new User({
                email,
                name: userName,
                image: profilePic,
                avatar: profilePic,
                channelname: "",
                discription: ""
            });
            await user.save();
            return res.status(201).json({
                message: "User created successfully",
                result: user
            });
        }
        return res.status(200).json({
            message: "User logged in successfully",
            result: user
        });
    } catch (error) {
        console.error("Login controller error:", error);
        res.status(500).json({ message: error.message });
    }
}
