import React, { useState } from "react";
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

    const handleProcessPayment = async (simulateFailure = false) => {
        if (!user?._id) {
            setErrorMessage("Please sign in before completing purchase.");
            return;
        }

        setLoading(true);
        setErrorMessage(null);

        try {
            // 1. Create Razorpay Test Order on backend
            const orderRes = await axiosInstance.post("/api/subscription/create-order", {
                userId: user._id,
                plan,
                billingcycle,
            });

            if (!orderRes.data?.success) {
                throw new Error("Failed to initialize payment order.");
            }

            const { orderId } = orderRes.data;

            if (simulateFailure) {
                // Verify as failed/cancelled
                await axiosInstance.post("/api/subscription/verify-payment", {
                    userId: user._id,
                    orderId,
                    paymentStatus: "failed",
                    paymentMethod: "Razorpay Test Gateway (Simulated Failure)",
                });
                setErrorMessage("Test payment simulation failed or was cancelled by user.");
                setLoading(false);
                return;
            }

            // 2. Verify payment on backend (complete test transaction)
            const verifyRes = await axiosInstance.post("/api/subscription/verify-payment", {
                userId: user._id,
                orderId,
                paymentStatus: "completed",
                paymentMethod:
                    selectedMethod === "upi"
                        ? "Razorpay UPI (Test)"
                        : selectedMethod === "netbanking"
                        ? "Razorpay NetBanking (Test)"
                        : "Razorpay Test Card",
            });

            if (verifyRes.data?.success && verifyRes.data?.invoice) {
                onPaymentSuccess(verifyRes.data.invoice);
                onClose();
            } else {
                setErrorMessage("Payment verification failed. Please try again.");
            }
        } catch (err: unknown) {
            const errObj = err && typeof err === "object" && "response" in err
                ? (err as { response?: { data?: { message?: string } } }).response
                : null;
            setErrorMessage(errObj?.data?.message || "An error occurred processing test payment.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-6">
                <DialogHeader className="space-y-1">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                            <CreditCard className="w-5 h-5" />
                            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                Razorpay Test Checkout
                            </DialogTitle>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            <Lock className="w-3 h-3" />
                            Sandbox
                        </span>
                    </div>
                    <p className="text-xs text-gray-500">Complete your subscription upgrade safely in test mode</p>
                </DialogHeader>

                {errorMessage && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs rounded-xl border border-red-200 dark:border-red-900 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Plan Summary Card */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold uppercase tracking-wider block">
                                Selected Plan
                            </span>
                            <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-100">
                                {plan} Membership ({billingcycle})
                            </h3>
                        </div>
                        <div className="text-right">
                            <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
                                ₹{amount.toLocaleString()}
                            </span>
                            <span className="block text-[10px] text-gray-500">Taxes Included</span>
                        </div>
                    </div>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                        Select Test Payment Method:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={() => setSelectedMethod("card")}
                            className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                                selectedMethod === "card"
                                    ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 dark:border-indigo-500 shadow-sm"
                                    : "border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
                            }`}
                        >
                            <CreditCard className="w-4 h-4" />
                            <span>Test Card</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedMethod("upi")}
                            className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                                selectedMethod === "upi"
                                    ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 dark:border-indigo-500 shadow-sm"
                                    : "border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
                            }`}
                        >
                            <QrCode className="w-4 h-4" />
                            <span>UPI / QR</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedMethod("netbanking")}
                            className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                                selectedMethod === "netbanking"
                                    ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 dark:border-indigo-500 shadow-sm"
                                    : "border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
                            }`}
                        >
                            <Building className="w-4 h-4" />
                            <span>NetBanking</span>
                        </button>
                    </div>
                </div>

                {/* Test Disclaimer */}
                <div className="bg-gray-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-gray-100 dark:border-zinc-800 flex items-start gap-2 text-[11px] text-gray-500">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>
                        This is a simulated Razorpay Test Gateway. No real charges or credit cards are required. Your account will be activated immediately with an official invoice.
                    </span>
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleProcessPayment(true)}
                        disabled={loading}
                        className="text-xs text-gray-400 hover:text-red-600 w-full sm:w-auto"
                    >
                        Simulate Failure
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => handleProcessPayment(false)}
                        disabled={loading}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold w-full sm:flex-1 h-9 shadow-md"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                Verifying Payment...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                Pay ₹{amount.toLocaleString()} (Test)
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PaymentCheckoutModal;
