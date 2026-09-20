import jwt from "jsonwebtoken";
import config from "../config/env.js";
import User from "../model/user.js";

/**
 * Signs a cryptographic JWT token for an authenticated user
 */
export const generateUserToken = (user) => {
    if (!user || !user._id) return null;
    return jwt.sign(
        {
            id: user._id.toString(),
            email: user.email,
            name: user.name || "",
            isAdmin: Boolean(user.isAdmin || user.user_type === "admin"),
        },
        config.jwtSecret,
        { expiresIn: "30d" }
    );
};

/**
 * Strict authentication middleware: rejects unauthenticated requests
 */
export const requireAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        let token = null;

        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        } else if (req.headers["x-auth-token"]) {
            token = req.headers["x-auth-token"];
        } else if (req.query?.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({
                message: "Authentication required. Missing Bearer token.",
                authRequired: true,
            });
        }

        const decoded = jwt.verify(token, config.jwtSecret);
        req.user = decoded;
        req.userId = decoded.id;
        return next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                message: "Session token expired. Please log in again.",
                tokenExpired: true,
            });
        }
        return res.status(401).json({
            message: "Invalid or forged authentication token.",
            authRequired: true,
        });
    }
};

/**
 * Admin authorization middleware: requires authenticated admin user
 */
export const requireAdmin = async (req, res, next) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ message: "Authentication required." });
        }

        if (req.user?.isAdmin) {
            return next();
        }

        const userDoc = await User.findById(req.userId).select("isAdmin user_type");
        if (!userDoc || (!userDoc.isAdmin && userDoc.user_type !== "admin")) {
            return res.status(403).json({ message: "Access denied. Admin privileges required." });
        }

        return next();
    } catch (error) {
        return res.status(500).json({ message: "Server error verifying admin privileges." });
    }
};

/**
 * Optional authentication middleware: extracts user if token provided, but allows guests
 */
export const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        let token = null;

        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        } else if (req.headers["x-auth-token"]) {
            token = req.headers["x-auth-token"];
        } else if (req.query?.token) {
            token = req.query.token;
        }

        if (token) {
            const decoded = jwt.verify(token, config.jwtSecret);
            req.user = decoded;
            req.userId = decoded.id;
        } else {
            req.user = null;
            req.userId = null;
        }
    } catch (error) {
        req.user = null;
        req.userId = null;
    }
    return next();
};
