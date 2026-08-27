"use client";

import React, { useState, useEffect } from "react";
import {
    CreditCard,
    ShieldCheck,
    Lock,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    ExternalLink,
    ArrowRight,
    BadgeCheck,
} from "lucide-react";
import axiosInstance from "@/lib/AxiosInstance";
import { useUser } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";


interface VerificationSuccessData {
    order_id: string;
    payment_id: string;
    amount: number;
    currency: string;
    verifiedAt: string;
}

export default function CheckoutPage() {
    const { user } = useUser();
    const [amountInRupees, setAmountInRupees] = useState<number>(499);
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{
        type: "success" | "error" | "info";
        title: string;
        description: string;
    } | null>(null);
    const [verifiedPayment, setVerifiedPayment] = useState<VerificationSuccessData | null>(null);

    // Dynamically load Razorpay standard checkout script
    useEffect(() => {
        if (!window.Razorpay) {
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.async = true;
            document.body.appendChild(script);
        }
    }, []);

    const handleStandardRazorpayCheckout = async () => {
        if (amountInRupees < 1) {
            setStatusMessage({
                type: "error",
                title: "Invalid Amount",
                description: "Minimum amount is ₹1.00 (100 paise).",
            });
            return;
        }

        setLoading(true);
        setStatusMessage({
            type: "info",
            title: "Creating Razorpay Order...",
            description: "Contacting the backend server to generate an official order ID.",
        });

        try {
            // STEP 1: BACKEND - Create Order (POST /api/create-order or /api/payment/create-order)
            const amountInPaise = Math.round(amountInRupees * 100);
            const orderRes = await axiosInstance.post("/api/create-order", {
                amount: amountInPaise,
                currency: "INR",
                receipt: `rcpt_${Date.now()}`,
                notes: {
                    userEmail: user?.email || "customer@example.com",
                    userName: user?.name || "Customer",
                },
            });

            if (!orderRes.data?.success && !orderRes.data?.order_id && !orderRes.data?.id) {
                throw new Error(orderRes.data?.message || "Failed to create order on server.");
            }

            const orderId = orderRes.data.order_id || orderRes.data.id;
            const keyId =
                orderRes.data.key_id ||
                process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

            // STEP 2: FRONTEND - Launch Razorpay Standard Checkout
            if (typeof window !== "undefined" && window.Razorpay) {
                const options = {
                    key: keyId,
                    amount: amountInPaise,
                    currency: "INR",
                    name: "YouTube Clone",
                    description: "Standard Web Checkout Payment",
                    image: "/placeholder.svg",
                    order_id: orderId,
                    prefill: {
                        name: user?.name || "Test User",
                        email: user?.email || "user@example.com",
                        contact: "9999999999",
                    },
                    method: {
                        netbanking: true,
                        card: true,
                        upi: true,
                        wallet: true,
                        paylater: true,
                    },
                    config: {
                        display: {
                            blocks: {
                                upi: {
                                    name: "Pay using UPI / QR",
                                    instruments: [
                                        {
                                            method: "upi",
                                        },
                                    ],
                                },
                                other: {
                                    name: "Other Payment Modes",
                                    instruments: [
                                        {
                                            method: "card",
                                        },
                                        {
                                            method: "netbanking",
                                        },
                                        {
                                            method: "wallet",
                                        },
                                        {
                                            method: "paylater",
                                        },
                                    ],
                                },
                            },
                            sequence: ["block.upi", "block.other"],
                            preferences: {
                                show_default_blocks: true,
                            },
                        },
                    },
                    theme: {
                        color: "#6366f1",
                    },
                    handler: async function (response: {
                        razorpay_payment_id: string;
                        razorpay_order_id: string;
                        razorpay_signature: string;
                    }) {
                        // STEP 3: BACKEND - Verify Payment Signature (POST /api/verify-payment)
                        try {
                            setLoading(true);
                            setStatusMessage({
                                type: "info",
                                title: "Verifying Payment Signature...",
                                description: "Verifying HMAC-SHA256 signature on backend server.",
                            });

                            const verifyRes = await axiosInstance.post("/api/verify-payment", {
                                razorpay_order_id: response.razorpay_order_id || orderId,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                            });

                            if (verifyRes.data?.success) {
                                setVerifiedPayment({
                                    order_id: response.razorpay_order_id || orderId,
                                    payment_id: response.razorpay_payment_id,
                                    amount: amountInRupees,
                                    currency: "INR",
                                    verifiedAt: new Date().toLocaleTimeString(),
                                });
                                setStatusMessage({
                                    type: "success",
                                    title: "Payment & Signature Verified Successfully!",
                                    description: `Payment ID: ${response.razorpay_payment_id} was verified with valid cryptographic HMAC-SHA256 signature.`,
                                });
                            } else {
                                setStatusMessage({
                                    type: "error",
                                    title: "Signature Verification Failed",
                                    description: verifyRes.data?.message || "Server signature mismatch.",
                                });
                            }
                        } catch (vErr: unknown) {
                            const errObj = vErr && typeof vErr === "object" && "response" in vErr
                                ? (vErr as { response?: { data?: { message?: string } } }).response
                                : null;
                            setStatusMessage({
                                type: "error",
                                title: "Verification Request Error",
                                description: errObj?.data?.message || "Failed to communicate with verification endpoint.",
                            });
                        } finally {
                            setLoading(false);
                        }
                    },
                    modal: {
                        ondismiss: function () {
                            setLoading(false);
                            setStatusMessage({
                                type: "info",
                                title: "Checkout Dismissed",
                                description: "Payment modal was closed by the user.",
                            });
                        },
                    },
                };

                const rzp = new window.Razorpay(options);

                // Handle payment failed event
                rzp.on("payment.failed", function (failResponse: {
                    error?: { description?: string; reason?: string };
                }) {
                    console.error("Razorpay payment failed:", failResponse.error);
                    setStatusMessage({
                        type: "error",
                        title: "Payment Failed",
                        description: failResponse.error?.description || "Payment was declined or failed.",
                    });
                    setLoading(false);
                });

                rzp.open();
                setLoading(false);
            } else {
                setStatusMessage({
                    type: "error",
                    title: "Razorpay SDK Not Loaded",
                    description: "checkout.js script is still loading. Please try again in a moment.",
                });
                setLoading(false);
            }
        } catch (err: unknown) {
            const errObj = err && typeof err === "object" && "response" in err
                ? (err as { response?: { data?: { message?: string } } }).response
                : null;
            setStatusMessage({
                type: "error",
                title: "Order Creation Failed",
                description: errObj?.data?.message || "Unable to reach create-order API endpoint.",
            });
            setLoading(false);
        }
    };

    return (
        <main className="flex-1 p-4 md:p-8 bg-zinc-50 dark:bg-zinc-950 min-h-[calc(100vh-3.5rem)]">
            <div className="max-w-3xl mx-auto space-y-8">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-purple-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-indigo-800/40">
                    <div className="relative z-10 space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/10 backdrop-blur-md border border-white/20 text-indigo-200">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>Razorpay Standard Web Checkout</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            Secure Payment Checkout
                        </h1>
                        <p className="text-xs sm:text-sm text-indigo-200">
                            Complete standard 3-step payment flow: Order creation, Razorpay modal checkout, and server-side HMAC-SHA256 signature verification.
                        </p>
                    </div>
                </div>

                {/* Main Checkout Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-800 p-6 sm:p-8 shadow-sm space-y-6">
                    {/* Amount Preset Selector */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Select Checkout Amount (INR)
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[199, 499, 999, 1799].map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setAmountInRupees(preset)}
                                    className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all ${
                                        amountInRupees === preset
                                            ? "border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 dark:border-indigo-500 shadow-sm"
                                            : "border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800"
                                    }`}
                                >
                                    ₹{preset}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Amount Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Or Enter Custom Amount (Minimum ₹1.00 / 100 paise)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-500 text-sm">
                                ₹
                            </span>
                            <input
                                type="number"
                                min={1}
                                value={amountInRupees}
                                onChange={(e) => setAmountInRupees(Math.max(1, Number(e.target.value)))}
                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Key Info Banner */}
                    <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-start justify-between gap-3 text-xs">
                        <div className="space-y-1">
                            <span className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                Standard Razorpay Integration Mode
                            </span>
                            <p className="text-indigo-800/80 dark:text-indigo-300/80 font-mono text-[11px]">
                                Key ID: {process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "Configured via environment"}
                            </p>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                            <ShieldCheck className="w-3 h-3" />
                            HMAC SHA-256
                        </span>
                    </div>

                    {/* Status Alert */}
                    {statusMessage && (
                        <div
                            className={`p-4 rounded-2xl text-xs border flex items-start gap-3 ${
                                statusMessage.type === "success"
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800"
                                    : statusMessage.type === "error"
                                    ? "bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 border-red-200 dark:border-red-800"
                                    : "bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800"
                            }`}
                        >
                            {statusMessage.type === "success" ? (
                                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                            ) : statusMessage.type === "error" ? (
                                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                            ) : (
                                <RefreshCw className="w-4 h-4 flex-shrink-0 text-blue-600 dark:text-blue-400 mt-0.5 animate-spin" />
                            )}
                            <div className="space-y-0.5">
                                <p className="font-bold">{statusMessage.title}</p>
                                <p className="text-[11px] opacity-90">{statusMessage.description}</p>
                            </div>
                        </div>
                    )}

                    {/* Verified Details Receipt */}
                    {verifiedPayment && (
                        <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                            <div className="flex items-center justify-between border-b border-emerald-200/60 dark:border-emerald-800/60 pb-2">
                                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                                    <BadgeCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    Payment Verification Details
                                </span>
                                <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                                    Verified at {verifiedPayment.verifiedAt}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div>
                                    <span className="text-gray-500 block text-[11px]">Razorpay Order ID</span>
                                    <span className="font-mono font-semibold text-gray-900 dark:text-gray-100 break-all">
                                        {verifiedPayment.order_id}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block text-[11px]">Razorpay Payment ID</span>
                                    <span className="font-mono font-semibold text-gray-900 dark:text-gray-100 break-all">
                                        {verifiedPayment.payment_id}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block text-[11px]">Amount Paid</span>
                                    <span className="font-bold text-gray-900 dark:text-gray-100">
                                        ₹{verifiedPayment.amount.toLocaleString()} {verifiedPayment.currency}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block text-[11px]">Verification Status</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                        HMAC-SHA256 SIGNATURE VALID
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Pay Button */}
                    <Button
                        onClick={handleStandardRazorpayCheckout}
                        disabled={loading}
                        className="w-full h-12 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Processing Checkout...</span>
                            </>
                        ) : (
                            <>
                                <CreditCard className="w-4 h-4" />
                                <span>Pay ₹{amountInRupees.toLocaleString()} with Razorpay</span>
                                <ArrowRight className="w-4 h-4 ml-1" />
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </main>
    );
}
