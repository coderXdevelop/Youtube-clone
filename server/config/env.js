import "dotenv/config";

export const config = {
    port: process.env.PORT || 5000,
    mongoUri: process.env.MONGODB_URI || "",
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
    razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID || "",
        keySecret: process.env.RAZORPAY_KEY_SECRET || "",
    },
    brevoApiKey: process.env.BREVO_API_KEY || "",
    brevoSenderName: process.env.BREVO_USER_NAME || "YouTube Clone",
    brevoSenderEmail: process.env.BREVO_USER_MAIL || "trackit769@gmail.com",
};

export default config;
