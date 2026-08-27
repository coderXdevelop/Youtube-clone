"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import {
    CreditCard,
    ShieldCheck,
    Lock,
    Sparkles,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    QrCode,
    Building,
    ExternalLink,
    KeyRound,
    Smartphone,
} from "lucide-react";
import axiosInstance from "@/lib/AxiosInstance";
import { useUser } from "@/lib/AuthContext";
import { InvoiceData } from "./InvoiceReceiptModal";

interface PaymentCheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    plan: string;
    billingcycle: string;
    amount: number;
    onPaymentSuccess: (invoice: InvoiceData) => void;
}

// Declare Razorpay window object for TypeScript
declare global {
    interface Window {
        Razorpay?: any;
    }
}

const PaymentCheckoutModal = ({
    isOpen,
    onClose,
    plan,
    billingcycle,
    amount,
    onPaymentSuccess,
}: PaymentCheckoutModalProps) => {
    const { user } = useUser();
    const [loading, setLoading] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState<"card" | "upi" | "netbanking">("card");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Simulated Card form
    const [cardNumber, setCardNumber] = useState("4111 1111 1111 1111");
    const [cardExpiry, setCardExpiry] = useState("12/28");
    const [cardCvv, setCardCvv] = useState("123");
    const [cardHolder, setCardHolder] = useState(user?.name || "Subscriber");

    // Simulated UPI form
    const [upiId, setUpiId] = useState("success@razorpay");

    // Simulated NetBanking
    const [selectedBank, setSelectedBank] = useState("HDFC");

    // OTP simulation step
    const [showOtpScreen, setShowOtpScreen] = useState(false);
    const [otpCode, setOtpCode] = useState("123456");
    const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

    // Dynamically load Razorpay standard checkout script
    useEffect(() => {
        if (typeof window !== "undefined" && !window.Razorpay) {
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.async = true;
            document.body.appendChild(script);
        }
    }, []);

    const handleModalClose = () => {
        if (!loading) {
            setErrorMessage(null);
            setShowOtpScreen(false);
            onClose();
        }
    };

    /**
     * Launch Real Official Razorpay Standard Checkout Popup
     */
    const handleLaunchOfficialRazorpay = async () => {
        if (!user?._id) {
            setErrorMessage("Please sign in to proceed with checkout.");
            return;
        }

        setLoading(true);
        setErrorMessage(null);

        try {
            const orderRes = await axiosInstance.post("/api/subscription/create-order", {
                userId: user._id,
                plan,
                billingcycle,
            });

            if (!orderRes.data?.success) {
                throw new Error(orderRes.data?.message || "Failed to initialize payment order.");
            }

            const { orderId, keyId, amountInPaise } = orderRes.data;
            const activeKeyId = keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_TUeuM9e49gLaL3";

            if (typeof window !== "undefined" && window.Razorpay) {
                interface RazorpaySuccessResponse {
                    razorpay_payment_id: string;
                    razorpay_order_id: string;
                    razorpay_signature: string;
                }

                interface RazorpayFailureResponse {
                    error?: {
                        code?: string;
                        description?: string;
                        source?: string;
                        step?: string;
                        reason?: string;
                        metadata?: {
                            order_id?: string;
                            payment_id?: string;
                        };
                    };
                }

                const options = {
                    key: activeKeyId,
                    amount: amountInPaise,
                    currency: "INR",
                    name: "YouTube Clone Premium",
                    description: `${plan} Membership (${billingcycle})`,
                    image: "/placeholder.svg",
                    order_id: orderId,
                    prefill: {
                        name: user.name || "Subscriber",
                        email: user.email || "",
                        contact: "9999999999",
                    },
                    notes: {
                        plan,
                        billingcycle,
                    },
                    theme: {
                        color: "#4f46e5",
                    },
                    handler: async function (response: RazorpaySuccessResponse) {
                        try {
                            setLoading(true);
                            const verifyRes = await axiosInstance.post("/api/subscription/verify-payment", {
                                userId: user._id,
                                orderId: response.razorpay_order_id || orderId,
                                paymentId: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                signature: response.razorpay_signature,
                                paymentStatus: "completed",
                                paymentMethod: "Razorpay Standard Checkout",
                            });

                            if (verifyRes.data?.success && verifyRes.data?.invoice) {
                                onPaymentSuccess(verifyRes.data.invoice);
                                onClose();
                            } else {
                                setErrorMessage(verifyRes.data?.message || "Signature verification failed on server.");
                            }
                        } catch (vErr: unknown) {
                            const errObj = vErr && typeof vErr === "object" && "response" in vErr
                                ? (vErr as { response?: { data?: { message?: string } } }).response
                                : null;
                            setErrorMessage(errObj?.data?.message || "Failed to verify Razorpay payment on server.");
                        } finally {
                            setLoading(false);
                        }
                    },
                    modal: {
                        ondismiss: function () {
                            setLoading(false);
                            console.log("Razorpay checkout modal dismissed by user.");
                        },
                    },
                };

                const rzp = new window.Razorpay(options);

                // Handle payment failed event
                rzp.on("payment.failed", function (response: RazorpayFailureResponse) {
                    console.error("Razorpay payment failed:", response.error);
                    setErrorMessage(
                        response.error?.description || "Payment failed or was declined by the bank."
                    );
                    setLoading(false);
                });

                rzp.open();
                setLoading(false);
            } else {
                // Fallback to in-app simulation
                handleInitInAppPayment();
            }
        } catch (err: unknown) {
            const errObj = err && typeof err === "object" && "response" in err
                ? (err as { response?: { data?: { message?: string } } }).response
                : null;
            setErrorMessage(errObj?.data?.message || "Failed to launch Razorpay popup.");
            setLoading(false);
        }
    };

    /**
     * In-App Razorpay Checkout Simulation (Starts with Order -> shows simulated OTP screen)
     */
    const handleInitInAppPayment = async () => {
        if (!user?._id) {
            setErrorMessage("Please sign in before completing purchase.");
            return;
        }

        setLoading(true);
        setErrorMessage(null);

        try {
            const orderRes = await axiosInstance.post("/api/subscription/create-order", {
                userId: user._id,
                plan,
                billingcycle,
            });

            if (!orderRes.data?.success) {
                throw new Error("Failed to initialize payment order.");
            }

            setActiveOrderId(orderRes.data.orderId);
            setShowOtpScreen(true);
        } catch (err: unknown) {
            const errObj = err && typeof err === "object" && "response" in err
                ? (err as { response?: { data?: { message?: string } } }).response
                : null;
            setErrorMessage(errObj?.data?.message || "Failed to initialize payment order.");
        } finally {
            setLoading(false);
        }
    };

    /**
     * Submit OTP & complete simulation
     */
    const handleVerifyOtpAndComplete = async (simulateFailure = false) => {
        if (!user?._id || !activeOrderId) return;

        setLoading(true);
        setErrorMessage(null);

        try {
            if (simulateFailure) {
                await axiosInstance.post("/api/subscription/verify-payment", {
                    userId: user._id,
                    orderId: activeOrderId,
                    paymentStatus: "failed",
                    paymentMethod: "Razorpay Test Simulation (Failed)",
                });
                setErrorMessage("Test payment failed as requested. No charges were made.");
                setShowOtpScreen(false);
                setLoading(false);
                return;
            }

            const methodTitle =
                selectedMethod === "upi"
                    ? `Razorpay UPI (${upiId})`
                    : selectedMethod === "netbanking"
                    ? `Razorpay NetBanking (${selectedBank})`
                    : `Razorpay Test Card (ending in ${cardNumber.slice(-4)})`;

            const verifyRes = await axiosInstance.post("/api/subscription/verify-payment", {
                userId: user._id,
                orderId: activeOrderId,
                paymentStatus: "completed",
                paymentMethod: methodTitle,
            });

            if (verifyRes.data?.success && verifyRes.data?.invoice) {
                onPaymentSuccess(verifyRes.data.invoice);
                onClose();
            } else {
                setErrorMessage("Payment verification failed.");
            }
        } catch (err: unknown) {
            const errObj = err && typeof err === "object" && "response" in err
                ? (err as { response?: { data?: { message?: string } } }).response
                : null;
            setErrorMessage(errObj?.data?.message || "Payment verification error.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleModalClose()}>
            <DialogContent className="sm:max-w-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-6 overflow-hidden">
                {/* Header with Razorpay Test Branding */}
                <DialogHeader className="border-b border-gray-100 dark:border-zinc-800 pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm tracking-tighter">
                                R
                            </div>
                            <div>
                                <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                                    <span>Razorpay Payment Gateway</span>
                                </DialogTitle>
                                <p className="text-[11px] text-gray-500">Test Sandbox Mode • Instant Activation</p>
                            </div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <Lock className="w-3 h-3" />
                            256-Bit Test SSL
                        </span>
                    </div>
                </DialogHeader>

                {errorMessage && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs rounded-xl border border-red-200 dark:border-red-900 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Plan & Amount Summary Bar */}
                <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-4 rounded-xl flex items-center justify-between shadow-md">
                    <div>
                        <span className="text-[11px] text-indigo-200 uppercase font-bold tracking-wider block">
                            Upgrading To
                        </span>
                        <h4 className="text-base font-extrabold text-white">
                            {plan} Plan ({billingcycle})
                        </h4>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-black text-white">
                            ₹{amount.toLocaleString()}
                        </span>
                        <span className="block text-[10px] text-indigo-200">18% GST Included</span>
                    </div>
                </div>

                {!showOtpScreen ? (
                    <div className="space-y-4 pt-1">
                        {/* Official Razorpay Popup Launcher */}
                        <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-3">
                            <div className="space-y-0.5">
                                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                    Official Razorpay Popup
                                </span>
                                <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
                                    Launches genuine test window with Key ID: <span className="font-mono font-semibold">{process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_TUeuM9e49gLaL3"}</span>
                                </p>
                            </div>
                            <Button
                                size="sm"
                                onClick={handleLaunchOfficialRazorpay}
                                disabled={loading}
                                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold whitespace-nowrap shadow-sm"
                            >
                                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                Launch Popup
                            </Button>
                        </div>

                        <div className="relative flex items-center justify-center">
                            <div className="border-t border-gray-200 dark:border-zinc-800 w-full" />
                            <span className="bg-white dark:bg-zinc-900 px-3 text-[11px] text-gray-400 font-semibold uppercase tracking-wider absolute">
                                Or Quick Test Checkout Below
                            </span>
                        </div>

                        {/* Payment Method Selector */}
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedMethod("card")}
                                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                                    selectedMethod === "card"
                                        ? "border-indigo-600 bg-indigo-50/80 text-indigo-900 dark:bg-indigo-950/70 dark:text-indigo-200 dark:border-indigo-500 shadow-sm"
                                        : "border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
                                }`}
                            >
                                <CreditCard className="w-4 h-4" />
                                <span>Cards</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedMethod("upi")}
                                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                                    selectedMethod === "upi"
                                        ? "border-indigo-600 bg-indigo-50/80 text-indigo-900 dark:bg-indigo-950/70 dark:text-indigo-200 dark:border-indigo-500 shadow-sm"
                                        : "border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
                                }`}
                            >
                                <QrCode className="w-4 h-4" />
                                <span>UPI / QR</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedMethod("netbanking")}
                                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                                    selectedMethod === "netbanking"
                                        ? "border-indigo-600 bg-indigo-50/80 text-indigo-900 dark:bg-indigo-950/70 dark:text-indigo-200 dark:border-indigo-500 shadow-sm"
                                        : "border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
                                }`}
                            >
                                <Building className="w-4 h-4" />
                                <span>NetBanking</span>
                            </button>
                        </div>

                        {/* Interactive Method Details Form */}
                        {selectedMethod === "card" && (
                            <div className="bg-gray-50 dark:bg-zinc-800/40 p-3.5 rounded-xl border border-gray-200 dark:border-zinc-800 space-y-2.5">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">Card Number</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={cardNumber}
                                            onChange={(e) => setCardNumber(e.target.value)}
                                            className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-mono font-semibold text-gray-900 dark:text-gray-100"
                                            placeholder="4111 1111 1111 1111"
                                        />
                                        <span className="absolute right-2.5 top-1.5 text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400">
                                            TEST VISA
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">Expiry (MM/YY)</label>
                                        <input
                                            type="text"
                                            value={cardExpiry}
                                            onChange={(e) => setCardExpiry(e.target.value)}
                                            className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-mono text-gray-900 dark:text-gray-100"
                                            placeholder="12/28"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">CVV</label>
                                        <input
                                            type="password"
                                            maxLength={3}
                                            value={cardCvv}
                                            onChange={(e) => setCardCvv(e.target.value)}
                                            className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-mono text-gray-900 dark:text-gray-100"
                                            placeholder="123"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedMethod === "upi" && (
                            <div className="bg-gray-50 dark:bg-zinc-800/40 p-3.5 rounded-xl border border-gray-200 dark:border-zinc-800 space-y-2.5">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">Virtual Payment Address (VPA / UPI ID)</label>
                                    <input
                                        type="text"
                                        value={upiId}
                                        onChange={(e) => setUpiId(e.target.value)}
                                        className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-mono text-gray-900 dark:text-gray-100"
                                        placeholder="success@razorpay"
                                    />
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                    <span className="text-[11px] text-gray-500">Quick Test Handles:</span>
                                    <button
                                        type="button"
                                        onClick={() => setUpiId("success@razorpay")}
                                        className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded text-[11px] font-medium hover:underline"
                                    >
                                        success@razorpay
                                    </button>
                                </div>
                            </div>
                        )}

                        {selectedMethod === "netbanking" && (
                            <div className="bg-gray-50 dark:bg-zinc-800/40 p-3.5 rounded-xl border border-gray-200 dark:border-zinc-800 space-y-2">
                                <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">Select Test Bank</label>
                                <select
                                    value={selectedBank}
                                    onChange={(e) => setSelectedBank(e.target.value)}
                                    className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100"
                                >
                                    <option value="HDFC">HDFC Bank (Test Sandbox)</option>
                                    <option value="ICICI">ICICI Bank (Test Sandbox)</option>
                                    <option value="SBI">State Bank of India (Test Sandbox)</option>
                                    <option value="Axis">Axis Bank (Test Sandbox)</option>
                                    <option value="Kotak">Kotak Mahindra Bank (Test Sandbox)</option>
                                </select>
                            </div>
                        )}
                    </div>
                ) : (
                    /* OTP Simulator Step */
                    <div className="space-y-4 py-2 text-center animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-900">
                            <Smartphone className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">
                                Enter Test 3D-Secure OTP
                            </h4>
                            <p className="text-xs text-gray-500">
                                A simulated one-time password has been sent to verify your test payment of <strong className="text-gray-900 dark:text-gray-100">₹{amount.toLocaleString()}</strong>.
                            </p>
                        </div>

                        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
                            Test OTP: <strong className="font-mono text-sm tracking-widest">123456</strong>
                        </div>

                        <div className="max-w-[200px] mx-auto">
                            <input
                                type="text"
                                maxLength={6}
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value)}
                                className="w-full text-center tracking-[0.5em] font-mono text-lg font-bold bg-gray-50 dark:bg-zinc-800 border-2 border-indigo-500 rounded-xl py-2 text-gray-900 dark:text-gray-100 focus:outline-none"
                            />
                        </div>
                    </div>
                )}

                {/* Footer Actions */}
                <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
                    {!showOtpScreen ? (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClose}
                                disabled={loading}
                                className="text-xs text-gray-500 w-full sm:w-auto"
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleInitInAppPayment}
                                disabled={loading}
                                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex-1 h-9 shadow-md"
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                        Proceed to Pay ₹{amount.toLocaleString()}
                                    </>
                                )}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleVerifyOtpAndComplete(true)}
                                disabled={loading}
                                className="text-xs text-red-500 hover:text-red-600 w-full sm:w-auto"
                            >
                                Simulate Failure
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => handleVerifyOtpAndComplete(false)}
                                disabled={loading}
                                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex-1 h-9 shadow-md"
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                        Authorizing...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                        Submit OTP & Activate Plan
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PaymentCheckoutModal;
