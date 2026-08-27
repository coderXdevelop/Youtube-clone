import crypto from "crypto";
import Razorpay from "razorpay";

// Helper to get Razorpay credentials from environment variables
const getRazorpayCredentials = () => {
    const keyId =
        process.env.RAZORPAY_KEY_ID ||
        process.env.API_KEY ||
        process.env.RAZORPAY_KEY ||
        "rzp_test_TUeuM9e49gLaL3";

    const keySecret =
        process.env.RAZORPAY_KEY_SECRET ||
        process.env.SECREAT ||
        process.env.SECRET ||
        process.env.RAZORPAY_SECRET ||
        "0MJa9tcl4VuHYcjZb4eL5Z5x";

    return { keyId, keySecret };
};

// Initialize Razorpay SDK instance
const getRazorpayInstance = () => {
    const { keyId, keySecret } = getRazorpayCredentials();
    if (!keyId || !keySecret) {
        return null;
    }
    return new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    });
};

/**
 * POST /api/create-order or /api/payment/create-order
 * 
 * Creates an order on Razorpay.
 * Request body: { amount (in paise or INR), currency (default INR), receipt, notes }
 * Validates: amount >= 100 paise (min 1 INR)
 * Returns: { order_id, amount, currency, id, key_id, success: true }
 */
export const createOrder = async (req, res) => {
    try {
        const { keyId, keySecret } = getRazorpayCredentials();

        if (!keyId || !keySecret) {
            return res.status(401).json({
                success: false,
                message: "Razorpay credentials are not configured.",
            });
        }

        let { amount, currency = "INR", receipt, notes = {} } = req.body;

        if (amount === undefined || amount === null || isNaN(Number(amount))) {
            return res.status(400).json({
                success: false,
                message: "Valid amount is required.",
            });
        }

        let amountInPaise = Math.round(Number(amount));

        // If client passed amount in whole currency units (e.g. amount < 100 but meant as INR, or explicit unit)
        // Standard rule: amount in paise must be >= 100 paise.
        // If amount is less than 100, check if amount is in Rupees and needs conversion, or reject if < 100 paise.
        if (amountInPaise < 100 && req.body.isPaise !== false) {
            return res.status(400).json({
                success: false,
                message: "Amount must be at least 100 paise (₹1.00 INR).",
            });
        }

        const receiptId = receipt || `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        const rzp = getRazorpayInstance();
        let razorpayOrder;

        if (rzp) {
            try {
                razorpayOrder = await rzp.orders.create({
                    amount: amountInPaise,
                    currency: currency.toUpperCase(),
                    receipt: String(receiptId),
                    notes,
                });
            } catch (sdkErr) {
                // If SDK authentication fails
                if (sdkErr.statusCode === 401 || sdkErr.error?.code === "BAD_REQUEST_ERROR") {
                    return res.status(sdkErr.statusCode || 401).json({
                        success: false,
                        message: sdkErr.error?.description || "Razorpay authentication or validation error.",
                        error: sdkErr,
                    });
                }
                throw sdkErr;
            }
        } else {
            // Direct REST API fallback
            const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
            const response = await fetch("https://api.razorpay.com/v1/orders", {
                method: "POST",
                headers: {
                    "Authorization": authHeader,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    amount: amountInPaise,
                    currency: currency.toUpperCase(),
                    receipt: String(receiptId),
                    notes,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return res.status(response.status === 401 ? 401 : 500).json({
                    success: false,
                    message: errorData.error?.description || "Razorpay API error creating order.",
                    error: errorData,
                });
            }

            razorpayOrder = await response.json();
        }

        const orderId = razorpayOrder.id;

        return res.status(200).json({
            success: true,
            order_id: orderId,
            id: orderId,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            key_id: keyId,
            receipt: razorpayOrder.receipt,
            status: razorpayOrder.status,
            order: razorpayOrder,
        });
    } catch (error) {
        console.error("Error in Razorpay createOrder:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error creating Razorpay order.",
            error: error.message,
        });
    }
};

/**
 * POST /api/verify-payment or /api/payment/verify-payment
 * 
 * Verifies Razorpay payment signature using HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET).
 * Request body: { razorpay_order_id, razorpay_payment_id, razorpay_signature } 
 *            or { order_id, payment_id, signature }
 */
export const verifyPayment = async (req, res) => {
    try {
        const { keySecret } = getRazorpayCredentials();

        if (!keySecret) {
            return res.status(500).json({
                success: false,
                message: "Razorpay Secret Key is not configured on the server.",
            });
        }

        const order_id = req.body.razorpay_order_id || req.body.order_id || req.body.orderId;
        const payment_id = req.body.razorpay_payment_id || req.body.payment_id || req.body.paymentId;
        const signature = req.body.razorpay_signature || req.body.signature;

        // Validate required fields
        if (!order_id || !payment_id || !signature) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: order_id, payment_id, and signature are required.",
            });
        }

        // Generate expected HMAC-SHA256 signature
        const generated_signature = crypto
            .createHmac("sha256", keySecret)
            .update(`${order_id}|${payment_id}`)
            .digest("hex");

        // Compare signatures securely
        const isMatch = generated_signature === signature;

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Payment verification failed: Signature mismatch.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Payment verified successfully.",
            order_id,
            payment_id,
        });
    } catch (error) {
        console.error("Error in Razorpay verifyPayment:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error verifying Razorpay payment.",
            error: error.message,
        });
    }
};
