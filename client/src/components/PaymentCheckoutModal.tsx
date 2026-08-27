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
    ShieldCheck,
    Lock,
    Sparkles,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    ArrowRight,
    Crown,
    Zap,
    CreditCard,
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
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
            onClose();
        }
    };

    /**
     * Launch Real Official Razorpay Standard Checkout Modal
     */
    const handleProceedToPay = async () => {
        if (!user?._id) {
            setErrorMessage("Please sign in to proceed with checkout.");
            return;
        }

        setLoading(true);
        setErrorMessage(null);

        try {
            // 1. Create order on backend
            const orderRes = await axiosInstance.post("/api/subscription/create-order", {
                userId: user._id,
                plan,
                billingcycle,
            });

            if (!orderRes.data?.success) {
                throw new Error(orderRes.data?.message || "Failed to initialize payment order.");
            }

            const { orderId, keyId, amountInPaise } = orderRes.data;
            const activeKeyId =
                keyId ||
                process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
                "rzp_test_TUeuM9e49gLaL3";

            // 2. Open standard Razorpay Checkout Modal
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
                            // 3. Verify signature on backend
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
                            const errObj =
                                vErr && typeof vErr === "object" && "response" in vErr
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
                            console.log("Razorpay checkout modal closed by user.");
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
                setErrorMessage("Razorpay SDK is loading. Please try again in a second.");
                setLoading(false);
            }
        } catch (err: unknown) {
            const errObj =
                err && typeof err === "object" && "response" in err
                    ? (err as { response?: { data?: { message?: string } } }).response
                    : null;
            setErrorMessage(errObj?.data?.message || "Failed to launch Razorpay checkout.");
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleModalClose()}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-6 overflow-hidden">
                {/* Header with Razorpay Branding */}
                <DialogHeader className="border-b border-gray-100 dark:border-zinc-800 pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm tracking-tighter shadow-sm">
                                R
                            </div>
                            <div>
                                <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                                    <span>Razorpay Checkout</span>
                                </DialogTitle>
                                <p className="text-[11px] text-gray-500">Secure Payment Gateway • Instant Upgrade</p>
                            </div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <Lock className="w-3 h-3" />
                            256-Bit SSL
                        </span>
                    </div>
                </DialogHeader>

                {/* Error Banner */}
                {errorMessage && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs rounded-xl border border-red-200 dark:border-red-900 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Plan & Amount Summary Bar */}
                <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-md">
                    <div className="space-y-0.5">
                        <span className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider block">
                            Selected Membership
                        </span>
                        <h4 className="text-base font-extrabold text-white flex items-center gap-1.5">
                            <Crown className="w-4 h-4 text-amber-400" />
                            {plan} Plan
                        </h4>
                        <span className="text-xs text-indigo-200 capitalize font-medium">
                            {billingcycle} billing cycle
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-black text-white">
                            ₹{amount.toLocaleString()}
                        </span>
                        <span className="block text-[10px] text-indigo-200">18% GST Included</span>
                    </div>
                </div>

                {/* Order Summary & Payment Info */}
                <div className="space-y-3 pt-1 text-xs">
                    <div className="p-3.5 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-200/80 dark:border-zinc-800 space-y-2">
                        <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                            <span>Account:</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-200">
                                {user?.email || "subscriber@example.com"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                            <span>Payment Methods Supported:</span>
                            <span className="font-medium text-indigo-600 dark:text-indigo-400">
                                UPI, Cards, NetBanking, QR
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                            <span>Activation:</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <Zap className="w-3 h-3" /> Instant
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 px-1">
                        <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span>
                            Clicking proceed will open the Razorpay payment gateway modal.
                        </span>
                    </div>
                </div>

                {/* Footer Actions */}
                <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleModalClose}
                        disabled={loading}
                        className="text-xs text-gray-500 w-full sm:w-auto"
                    >
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleProceedToPay}
                        disabled={loading}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex-1 h-10 rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Opening Razorpay Gateway...</span>
                            </>
                        ) : (
                            <>
                                <CreditCard className="w-4 h-4" />
                                <span>Proceed to Pay ₹{amount.toLocaleString()}</span>
                                <ArrowRight className="w-4 h-4 ml-1" />
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PaymentCheckoutModal;
