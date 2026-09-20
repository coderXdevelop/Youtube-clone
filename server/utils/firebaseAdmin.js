import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import jwt from "jsonwebtoken";

let isFirebaseAdminInitialized = false;

try {
    const apps = getApps();
    if (!apps.length) {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            let serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
            if (typeof serviceAccount === "string") {
                try {
                    serviceAccount = JSON.parse(serviceAccount);
                } catch (parseErr) {
                    console.error("[FIREBASE ADMIN] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON string:", parseErr.message);
                    throw parseErr;
                }
            }
            initializeApp({
                credential: cert(serviceAccount),
            });
            isFirebaseAdminInitialized = true;
        } else if (process.env.NODE_ENV === "production") {
            throw new Error("FIREBASE_SERVICE_ACCOUNT is required in production for secure token verification.");
        } else {
            console.warn("[FIREBASE ADMIN] Running in development/test mode without FIREBASE_SERVICE_ACCOUNT credentials.");
        }
    } else {
        isFirebaseAdminInitialized = true;
    }
} catch (err) {
    if (process.env.NODE_ENV === "production") {
        throw err;
    }
    console.warn("[FIREBASE ADMIN] Initialization notice:", err.message);
}

/**
 * Verify a client-supplied Firebase ID token
 * @param {string} idToken
 * @returns {Promise<{ email: string, name?: string, picture?: string, uid: string }>}
 */
export const verifyFirebaseToken = async (idToken) => {
    if (!idToken || typeof idToken !== "string") {
        throw new Error("Missing Firebase ID token.");
    }

    // 1. If Firebase Admin SDK is configured with credentials, perform strict cryptographic verification
    if (isFirebaseAdminInitialized) {
        try {
            const decoded = await getAuth().verifyIdToken(idToken);
            if (decoded && decoded.email) {
                return {
                    email: decoded.email,
                    name: decoded.name || "",
                    picture: decoded.picture || "",
                    uid: decoded.uid,
                };
            }
        } catch (adminErr) {
            console.warn("[FIREBASE ADMIN] verifyIdToken error:", adminErr.message);
            throw new Error(`Invalid or expired Firebase ID token: ${adminErr.message}`);
        }
    }

    // In production, refuse to proceed if Admin SDK is uninitialized
    if (process.env.NODE_ENV === "production") {
        throw new Error("Firebase Admin SDK is not initialized. Token verification rejected in production.");
    }

    // 2. Fallback token decode & claims verification (for local development / test without full service account key)
    try {
        const decoded = jwt.decode(idToken);
        if (!decoded || typeof decoded !== "object") {
            throw new Error("Malformed JWT payload.");
        }

        // Validate expiration
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
            throw new Error("Firebase ID token has expired.");
        }

        // Validate standard Firebase token issuer and subject
        if (decoded.iss && !decoded.iss.includes("securetoken.google.com")) {
            throw new Error("Invalid token issuer. Expected Firebase Google token.");
        }

        if (!decoded.email) {
            throw new Error("Firebase token missing verified email claim.");
        }

        return {
            email: decoded.email,
            name: decoded.name || "",
            picture: decoded.picture || "",
            uid: decoded.user_id || decoded.sub || "",
        };
    } catch (decodeErr) {
        throw new Error(`Token verification failed: ${decodeErr.message}`);
    }
};

export default { verifyFirebaseToken };
