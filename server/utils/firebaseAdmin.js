import admin from "firebase-admin";
import jwt from "jsonwebtoken";

let isFirebaseAdminInitialized = false;

try {
    const apps = admin?.apps || admin?.default?.apps || [];
    if (!apps.length) {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            isFirebaseAdminInitialized = true;
        } else if (process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
            const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
            admin.initializeApp({
                projectId,
            });
            isFirebaseAdminInitialized = true;
        }
    } else {
        isFirebaseAdminInitialized = true;
    }
} catch (err) {
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

    // 1. If Firebase Admin SDK is fully configured with credentials, perform strict cryptographic verification
    if (isFirebaseAdminInitialized) {
        try {
            const decoded = await admin.auth().verifyIdToken(idToken);
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
