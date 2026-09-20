import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const TEST_JWT_SECRET = "test_jwt_secret_key_1234567890_abcdef";

// Sample Express app configured with our security middlewares for unit testing
const createTestApp = () => {
    const app = express();
    app.use(helmet());
    app.use(express.json());

    const allowedOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];
    const corsOptions = {
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
    };
    app.use(cors(corsOptions));

    // Auth Middleware under test
    const requireAuth = (req, res, next) => {
        const authHeader = req.headers.authorization;
        let token = null;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        } else if (req.headers["x-auth-token"]) {
            token = req.headers["x-auth-token"];
        }

        if (!token) {
            return res.status(401).json({ message: "Authentication required.", authRequired: true });
        }

        try {
            const decoded = jwt.verify(token, TEST_JWT_SECRET);
            req.user = decoded;
            req.userId = decoded.id;
            return next();
        } catch {
            return res.status(401).json({ message: "Invalid or forged authentication token." });
        }
    };

    // Admin Middleware under test
    const requireAdmin = (req, res, next) => {
        if (!req.user?.isAdmin) {
            return res.status(403).json({ message: "Access denied. Admin privileges required." });
        }
        return next();
    };

    // Payment verification route under test
    app.post("/api/test/verify-payment", requireAuth, (req, res) => {
        const { orderId, paymentId, signature, storedUserId } = req.body;
        const keySecret = "test_razorpay_secret";

        if (!signature || !paymentId || !orderId) {
            return res.status(400).json({ success: false, message: "Payment signature, secret key, and payment ID are required for verification." });
        }

        // Ownership check
        if (storedUserId && storedUserId !== req.userId) {
            return res.status(403).json({ success: false, message: "Unauthorized: This payment order belongs to another user account." });
        }

        const expectedSignature = crypto
            .createHmac("sha256", keySecret)
            .update(`${orderId}|${paymentId}`)
            .digest("hex");

        const expectedBuf = Buffer.from(expectedSignature, "utf-8");
        const actualBuf = Buffer.from(signature, "utf-8");

        if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
            return res.status(400).json({ success: false, message: "Payment signature verification failed. Unauthorized transaction." });
        }

        return res.status(200).json({ success: true, message: "Payment verified successfully." });
    });

    // Protected user & admin routes
    app.get("/api/test/protected", requireAuth, (req, res) => {
        res.json({ success: true, userId: req.userId });
    });

    app.get("/api/test/admin-only", requireAuth, requireAdmin, (req, res) => {
        res.json({ success: true, admin: true });
    });

    // Error handler for CORS
    app.use((err, req, res, next) => {
        if (err.message === "Not allowed by CORS") {
            return res.status(403).json({ error: "Not allowed by CORS" });
        }
        return res.status(500).json({ error: err.message });
    });

    return app;
};

test("Security Test Suite", async (t) => {
    const app = createTestApp();

    await t.test("1. CORS rejects untrusted origins", async () => {
        const res = await request(app)
            .get("/api/test/protected")
            .set("Origin", "http://malicious-site.attacker.com");

        assert.equal(res.status, 403);
    });

    await t.test("2. CORS allows whitelisted origins", async () => {
        const res = await request(app)
            .get("/api/test/protected")
            .set("Origin", "http://localhost:3000");

        // Should pass CORS check (even though auth fails with 401)
        assert.notEqual(res.status, 403);
        assert.equal(res.status, 401);
    });

    await t.test("3. requireAuth rejects missing Bearer token with 401", async () => {
        const res = await request(app).get("/api/test/protected");
        assert.equal(res.status, 401);
        assert.equal(res.body.authRequired, true);
    });

    await t.test("4. requireAuth rejects forged/invalid tokens", async () => {
        const fakeToken = jwt.sign({ id: "user_123" }, "wrong_secret");
        const res = await request(app)
            .get("/api/test/protected")
            .set("Authorization", `Bearer ${fakeToken}`);

        assert.equal(res.status, 401);
    });

    await t.test("5. requireAuth accepts valid JWT tokens", async () => {
        const validToken = jwt.sign({ id: "user_123", email: "user@test.com" }, TEST_JWT_SECRET);
        const res = await request(app)
            .get("/api/test/protected")
            .set("Authorization", `Bearer ${validToken}`);

        assert.equal(res.status, 200);
        assert.equal(res.body.userId, "user_123");
    });

    await t.test("6. requireAdmin blocks non-admin users with 403", async () => {
        const userToken = jwt.sign({ id: "user_123", isAdmin: false }, TEST_JWT_SECRET);
        const res = await request(app)
            .get("/api/test/admin-only")
            .set("Authorization", `Bearer ${userToken}`);

        assert.equal(res.status, 403);
    });

    await t.test("7. requireAdmin permits authenticated admins", async () => {
        const adminToken = jwt.sign({ id: "admin_999", isAdmin: true }, TEST_JWT_SECRET);
        const res = await request(app)
            .get("/api/test/admin-only")
            .set("Authorization", `Bearer ${adminToken}`);

        assert.equal(res.status, 200);
        assert.equal(res.body.admin, true);
    });

    await t.test("8. Payment verification rejects request missing signature", async () => {
        const userToken = jwt.sign({ id: "user_123" }, TEST_JWT_SECRET);
        const res = await request(app)
            .post("/api/test/verify-payment")
            .set("Authorization", `Bearer ${userToken}`)
            .send({ orderId: "order_123", paymentId: "pay_123" });

        assert.equal(res.status, 400);
    });

    await t.test("9. Payment verification blocks user from verifying another user's order (IDOR)", async () => {
        const attackerToken = jwt.sign({ id: "attacker_user" }, TEST_JWT_SECRET);
        const keySecret = "test_razorpay_secret";
        const orderId = "order_target_123";
        const paymentId = "pay_target_123";
        const signature = crypto
            .createHmac("sha256", keySecret)
            .update(`${orderId}|${paymentId}`)
            .digest("hex");

        const res = await request(app)
            .post("/api/test/verify-payment")
            .set("Authorization", `Bearer ${attackerToken}`)
            .send({
                orderId,
                paymentId,
                signature,
                storedUserId: "victim_user",
            });

        assert.equal(res.status, 403);
    });

    await t.test("10. Payment verification succeeds with valid signature and matching owner", async () => {
        const userToken = jwt.sign({ id: "user_123" }, TEST_JWT_SECRET);
        const keySecret = "test_razorpay_secret";
        const orderId = "order_123";
        const paymentId = "pay_123";
        const signature = crypto
            .createHmac("sha256", keySecret)
            .update(`${orderId}|${paymentId}`)
            .digest("hex");

        const res = await request(app)
            .post("/api/test/verify-payment")
            .set("Authorization", `Bearer ${userToken}`)
            .send({
                orderId,
                paymentId,
                signature,
                storedUserId: "user_123",
            });

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
    });
});
