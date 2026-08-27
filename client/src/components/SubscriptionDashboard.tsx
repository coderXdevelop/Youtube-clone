"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Crown,
    Check,
    X,
    Sparkles,
    ShieldCheck,
    CreditCard,
    FileText,
    Calendar,
    Clock,
    Zap,
    Download,
    Eye,
    CheckCircle2,
    RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/lib/AxiosInstance";
import { useUser } from "@/lib/AuthContext";
import { format } from "date-fns";
import PaymentCheckoutModal from "./PaymentCheckoutModal";
import InvoiceReceiptModal, { InvoiceData } from "./InvoiceReceiptModal";

interface PlanDetail {
    name: string;
    tagline: string;
    popular?: boolean;
    pricing: {
        monthly: number;
        quarterly: number;
        yearly: number;
    };
    downloadsPerDay: number;
    maxQuality: string;
    adFree: boolean;
    priorityAccess: boolean;
    exclusiveCourses: boolean;
    maxDevices: number;
    features: string[];
}

interface UserSubscriptionInfo {
    plan: string;
    billingcycle: string;
    status: string;
    expiresAt: string | null;
    startDate?: string | null;
    lastInvoice?: string;
    isExpired: boolean;
    daysRemaining: number;
}

interface TransactionItem {
    _id: string;
    orderid: string;
    paymentid: string;
    invoicenumber: string;
    plan: string;
    billingcycle: string;
    amount: number;
    paymentstatus: string;
    subscriptionstart: string;
    subscriptionend: string;
    createdAt: string;
}

export default function SubscriptionDashboard() {
    const { user } = useUser();
    const [plans, setPlans] = useState<Record<string, PlanDetail> | null>(null);
    const [userSub, setUserSub] = useState<UserSubscriptionInfo | null>(null);
    const [billingCycle, setBillingCycle] = useState<"monthly" | "quarterly" | "yearly">("monthly");
    const [billingHistory, setBillingHistory] = useState<TransactionItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
    const [selectedCheckoutPlan, setSelectedCheckoutPlan] = useState<string>("Silver");
    const [selectedCheckoutAmount, setSelectedCheckoutAmount] = useState<number>(399);
    const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
    const [currentInvoice, setCurrentInvoice] = useState<InvoiceData | null>(null);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

    const loadSubscriptionData = useCallback(async () => {
        setLoading(true);
        try {
            const params = user?._id ? `?userId=${user._id}` : "";
            const plansRes = await axiosInstance.get(`/api/subscription/plans${params}`);

            if (plansRes.data?.plans) {
                setPlans(plansRes.data.plans);
            }
            if (plansRes.data?.userSubscription) {
                setUserSub(plansRes.data.userSubscription);
            }

            if (user?._id) {
                const historyRes = await axiosInstance.get(`/api/subscription/billing-history/${user._id}`);
                if (Array.isArray(historyRes.data)) {
                    setBillingHistory(historyRes.data);
                }
            }
        } catch (error) {
            console.error("Failed to load subscription data:", error);
        } finally {
            setLoading(false);
        }
    }, [user?._id]);

    useEffect(() => {
        loadSubscriptionData();
    }, [loadSubscriptionData]);

    const handleSelectPlan = (planName: string) => {
        if (!user?._id) {
            alert("Please sign in to choose a subscription plan.");
            return;
        }

        if (planName === "Free") {
            alert("You are already on the Free Plan.");
            return;
        }

        if (!plans || !plans[planName]) return;

        const amount = plans[planName].pricing[billingCycle];
        setSelectedCheckoutPlan(planName);
        setSelectedCheckoutAmount(amount);
        setCheckoutModalOpen(true);
    };

    const handlePaymentSuccess = (invoice: InvoiceData) => {
        setCurrentInvoice(invoice);
        setInvoiceModalOpen(true);
        setFeedbackMessage(`Success! You have upgraded to the ${invoice.plan} Plan.`);
        loadSubscriptionData();
    };

    const handleCancelSubscription = async () => {
        if (!user?._id) return;
        if (!confirm("Are you sure you want to cancel your active subscription? You will retain access until your current billing period ends.")) {
            return;
        }

        try {
            const res = await axiosInstance.post("/api/subscription/cancel", { userId: user._id });
            if (res.data?.success) {
                setFeedbackMessage(res.data.message);
                loadSubscriptionData();
            }
        } catch (err) {
            console.error("Cancel subscription error:", err);
            alert("Failed to cancel subscription.");
        }
    };

    const handleViewPastInvoice = (item: TransactionItem) => {
        const invoicePayload: InvoiceData = {
            invoiceNumber: item.invoicenumber,
            orderId: item.orderid,
            paymentId: item.paymentid,
            date: item.subscriptionstart || item.createdAt,
            plan: item.plan,
            billingcycle: item.billingcycle,
            amount: item.amount,
            currency: "INR",
            customerName: user?.name || "Subscriber",
            customerEmail: user?.email || "",
            validUntil: item.subscriptionend,
            paymentMethod: "Razorpay Test Gateway",
            status: "PAID",
        };
        setCurrentInvoice(invoicePayload);
        setInvoiceModalOpen(true);
    };

    if (loading) {
        return (
            <div className="py-20 text-center space-y-3">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin text-indigo-600" />
                <p className="text-sm text-gray-500">Loading subscription plans & dashboard...</p>
            </div>
        );
    }

    const currentPlanName = userSub?.plan || "Free";

    return (
        <div className="space-y-10 pb-12">
            {/* 1. Header Banner & Status */}
            <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-purple-950 text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-3 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/10 backdrop-blur-md border border-white/20 text-indigo-200">
                            <Crown className="w-4 h-4 text-amber-400" />
                            <span>YouTube Clone Premium Membership</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                            Choose the Perfect Plan for Your Experience
                        </h1>
                        <p className="text-sm sm:text-base text-indigo-200 leading-relaxed">
                            Unlock offline video downloads, crystal-clear 4K HDR streaming, 100% ad-free viewing, and exclusive creator courses.
                        </p>
                    </div>

                    {/* Current Active Plan Badge / Card */}
                    <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/15 min-w-[280px] space-y-3 shadow-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-indigo-200 font-medium">Your Current Plan:</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase ${
                                currentPlanName === "Gold"
                                    ? "bg-amber-400 text-indigo-950"
                                    : currentPlanName === "Silver"
                                    ? "bg-slate-300 text-slate-900"
                                    : currentPlanName === "Bronze"
                                    ? "bg-amber-600 text-white"
                                    : "bg-white/20 text-white"
                            }`}>
                                {currentPlanName} Plan
                            </span>
                        </div>

                        {currentPlanName !== "Free" && userSub?.expiresAt ? (
                            <div className="space-y-2 border-t border-white/10 pt-2 text-xs">
                                <div className="flex items-center justify-between text-indigo-200">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        Remaining:
                                    </span>
                                    <span className="font-bold text-white">
                                        {userSub.daysRemaining} days left
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-indigo-200">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        Valid Until:
                                    </span>
                                    <span className="font-medium text-white">
                                        {format(new Date(userSub.expiresAt), "MMM d, yyyy")}
                                    </span>
                                </div>
                                {userSub.status === "cancelled" ? (
                                    <span className="inline-block text-[11px] text-amber-300 font-medium">
                                        Auto-renewal cancelled (access valid till expiry)
                                    </span>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCancelSubscription}
                                        className="h-6 px-0 text-[11px] text-red-300 hover:text-red-200 hover:bg-transparent"
                                    >
                                        Cancel Subscription
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <p className="text-xs text-indigo-200 leading-relaxed border-t border-white/10 pt-2">
                                Upgrade today to download more videos daily and stream in Full HD without ads.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {feedbackMessage && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-sm rounded-2xl border border-emerald-200 dark:border-emerald-900 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        <span>{feedbackMessage}</span>
                    </div>
                    <button
                        onClick={() => setFeedbackMessage(null)}
                        className="text-xs hover:underline font-semibold"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* 2. Billing Cycle Switcher */}
            <div className="flex flex-col items-center justify-center space-y-3">
                <span className="text-xs uppercase font-bold tracking-widest text-gray-500 dark:text-gray-400">
                    Select Billing Period
                </span>
                <div className="bg-gray-100 dark:bg-zinc-800/80 p-1.5 rounded-2xl flex items-center gap-1 border border-gray-200 dark:border-zinc-700">
                    <button
                        onClick={() => setBillingCycle("monthly")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            billingCycle === "monthly"
                                ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                        }`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBillingCycle("quarterly")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            billingCycle === "quarterly"
                                ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                        }`}
                    >
                        <span>Quarterly (3 Mo)</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Save ~16%
                        </span>
                    </button>
                    <button
                        onClick={() => setBillingCycle("yearly")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            billingCycle === "yearly"
                                ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                        }`}
                    >
                        <span>Yearly (12 Mo)</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Save ~25%
                        </span>
                    </button>
                </div>
            </div>

            {/* 3. Subscription Plan Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans &&
                    Object.entries(plans).map(([key, plan]) => {
                        const isCurrent = currentPlanName === key;
                        const price = plan.pricing[billingCycle];
                        const isPopular = plan.popular;

                        return (
                            <div
                                key={key}
                                className={`rounded-3xl border p-6 flex flex-col justify-between transition-all duration-300 relative ${
                                    isPopular
                                        ? "border-indigo-500 dark:border-indigo-500 shadow-xl bg-gradient-to-b from-indigo-50/50 to-white dark:from-indigo-950/30 dark:to-zinc-900 ring-2 ring-indigo-500/20"
                                        : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md"
                                }`}
                            >
                                {isPopular && (
                                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                        <span className="bg-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                                            Most Popular
                                        </span>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                            {plan.name}
                                        </h3>
                                        <p className="text-xs text-gray-500 min-h-[32px] leading-snug">
                                            {plan.tagline}
                                        </p>
                                    </div>

                                    {/* Price */}
                                    <div className="py-2 border-y border-gray-100 dark:border-zinc-800">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
                                                ₹{price.toLocaleString()}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {price === 0 ? "forever" : `/${billingCycle === "yearly" ? "yr" : billingCycle === "quarterly" ? "3 mo" : "mo"}`}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Feature Highlights */}
                                    <ul className="space-y-2.5 text-xs text-gray-700 dark:text-gray-300">
                                        {plan.features.map((f, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <div className="w-4 h-4 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <Check className="w-3 h-3 stroke-[3]" />
                                                </div>
                                                <span>{f}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Action Button */}
                                <div className="pt-6">
                                    {isCurrent ? (
                                        <Button
                                            disabled
                                            className="w-full text-xs font-bold bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 cursor-default h-10 rounded-xl"
                                        >
                                            Current Plan
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => handleSelectPlan(key)}
                                            className={`w-full text-xs font-bold h-10 rounded-xl shadow-sm transition-all ${
                                                isPopular
                                                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none"
                                                    : "bg-gray-900 hover:bg-gray-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                                            }`}
                                        >
                                            {key === "Free" ? "Downgrade" : `Upgrade to ${key}`}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
            </div>

            {/* 4. Full Feature Comparison Matrix */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-800 p-6 md:p-8 space-y-6 shadow-sm">
                <div className="space-y-1">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        Feature Comparison Matrix
                    </h2>
                    <p className="text-xs text-gray-500">
                        Compare streaming quality, daily download quotas, and benefits across all membership tiers.
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-gray-400">
                                <th className="py-3 px-4 font-semibold">Features & Benefits</th>
                                <th className="py-3 px-4 font-semibold text-center">Free</th>
                                <th className="py-3 px-4 font-semibold text-center">Bronze</th>
                                <th className="py-3 px-4 font-semibold text-center text-indigo-600 dark:text-indigo-400 font-bold">Silver (Popular)</th>
                                <th className="py-3 px-4 font-semibold text-center text-amber-600 dark:text-amber-400 font-bold">Gold (VIP)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-gray-800 dark:text-gray-200">
                            <tr>
                                <td className="py-3.5 px-4 font-medium flex items-center gap-2">
                                    <Download className="w-4 h-4 text-indigo-500" />
                                    Daily Video Downloads
                                </td>
                                <td className="py-3.5 px-4 text-center">1 / day</td>
                                <td className="py-3.5 px-4 text-center font-semibold">5 / day</td>
                                <td className="py-3.5 px-4 text-center font-bold text-indigo-600 dark:text-indigo-400">15 / day</td>
                                <td className="py-3.5 px-4 text-center font-bold text-amber-600 dark:text-amber-400">50 / day (Unlimited)</td>
                            </tr>
                            <tr>
                                <td className="py-3.5 px-4 font-medium flex items-center gap-2">
                                    <Eye className="w-4 h-4 text-blue-500" />
                                    Maximum Streaming Quality
                                </td>
                                <td className="py-3.5 px-4 text-center text-gray-500">720p HD</td>
                                <td className="py-3.5 px-4 text-center">1080p Full HD</td>
                                <td className="py-3.5 px-4 text-center font-semibold">1440p 2K QHD</td>
                                <td className="py-3.5 px-4 text-center font-bold text-amber-600 dark:text-amber-400">4K Ultra HD + HDR</td>
                            </tr>
                            <tr>
                                <td className="py-3.5 px-4 font-medium flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-amber-500" />
                                    Ad-Free Viewing Experience
                                </td>
                                <td className="py-3.5 px-4 text-center text-gray-400">
                                    <X className="w-4 h-4 mx-auto text-gray-300" />
                                </td>
                                <td className="py-3.5 px-4 text-center text-emerald-600">
                                    <Check className="w-4 h-4 mx-auto" />
                                </td>
                                <td className="py-3.5 px-4 text-center text-emerald-600">
                                    <Check className="w-4 h-4 mx-auto" />
                                </td>
                                <td className="py-3.5 px-4 text-center text-emerald-600">
                                    <Check className="w-4 h-4 mx-auto" />
                                </td>
                            </tr>
                            <tr>
                                <td className="py-3.5 px-4 font-medium flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-purple-500" />
                                    Exclusive Premium Courses
                                </td>
                                <td className="py-3.5 px-4 text-center text-gray-400">
                                    <X className="w-4 h-4 mx-auto text-gray-300" />
                                </td>
                                <td className="py-3.5 px-4 text-center text-gray-400">
                                    <X className="w-4 h-4 mx-auto text-gray-300" />
                                </td>
                                <td className="py-3.5 px-4 text-center text-emerald-600 font-semibold">
                                    Included
                                </td>
                                <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">
                                    All VIP Courses
                                </td>
                            </tr>
                            <tr>
                                <td className="py-3.5 px-4 font-medium flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                    Registered Devices Allowed
                                </td>
                                <td className="py-3.5 px-4 text-center">1 Device</td>
                                <td className="py-3.5 px-4 text-center">2 Devices</td>
                                <td className="py-3.5 px-4 text-center">4 Devices</td>
                                <td className="py-3.5 px-4 text-center font-bold text-amber-600 dark:text-amber-400">Unlimited</td>
                            </tr>
                            <tr>
                                <td className="py-3.5 px-4 font-medium flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-500" />
                                    Free Re-downloads (24h Window)
                                </td>
                                <td className="py-3.5 px-4 text-center text-emerald-600">
                                    <Check className="w-4 h-4 mx-auto" />
                                </td>
                                <td className="py-3.5 px-4 text-center text-emerald-600">
                                    <Check className="w-4 h-4 mx-auto" />
                                </td>
                                <td className="py-3.5 px-4 text-center text-emerald-600">
                                    <Check className="w-4 h-4 mx-auto" />
                                </td>
                                <td className="py-3.5 px-4 text-center text-emerald-600">
                                    <Check className="w-4 h-4 mx-auto" />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 5. Billing History & Invoices */}
            {user?._id && (
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-800 p-6 md:p-8 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-indigo-600" />
                                Billing History & Tax Invoices
                            </h2>
                            <p className="text-xs text-gray-500">
                                View, download, or print official receipts and transaction records for past payments.
                            </p>
                        </div>
                    </div>

                    {billingHistory.length === 0 ? (
                        <div className="py-8 text-center text-xs text-gray-500 border border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl">
                            No billing transactions found. Once you purchase a subscription plan, your official invoices will appear here.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50 dark:bg-zinc-800/60 text-gray-500 text-[11px] border-b border-gray-200 dark:border-zinc-800">
                                    <tr>
                                        <th className="py-2.5 px-3 font-semibold">Date</th>
                                        <th className="py-2.5 px-3 font-semibold">Invoice #</th>
                                        <th className="py-2.5 px-3 font-semibold">Plan / Cycle</th>
                                        <th className="py-2.5 px-3 font-semibold">Amount</th>
                                        <th className="py-2.5 px-3 font-semibold">Status</th>
                                        <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60">
                                    {billingHistory.map((item) => (
                                        <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30">
                                            <td className="py-3 px-3 font-medium text-gray-800 dark:text-gray-200">
                                                {format(new Date(item.subscriptionstart || item.createdAt), "MMM dd, yyyy")}
                                            </td>
                                            <td className="py-3 px-3 font-mono text-gray-600 dark:text-gray-400">
                                                {item.invoicenumber}
                                            </td>
                                            <td className="py-3 px-3 capitalize font-semibold text-gray-900 dark:text-gray-100">
                                                {item.plan} ({item.billingcycle})
                                            </td>
                                            <td className="py-3 px-3 font-bold text-gray-900 dark:text-gray-100">
                                                ₹{item.amount.toLocaleString()}
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                    PAID
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleViewPastInvoice(item)}
                                                    className="h-7 text-xs text-indigo-600 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50"
                                                >
                                                    <FileText className="w-3.5 h-3.5 mr-1" />
                                                    View Invoice
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Razorpay Test Checkout Modal */}
            <PaymentCheckoutModal
                isOpen={checkoutModalOpen}
                onClose={() => setCheckoutModalOpen(false)}
                plan={selectedCheckoutPlan}
                billingcycle={billingCycle}
                amount={selectedCheckoutAmount}
                onPaymentSuccess={handlePaymentSuccess}
            />

            {/* Invoice / Tax Receipt Modal */}
            <InvoiceReceiptModal
                isOpen={invoiceModalOpen}
                onClose={() => setInvoiceModalOpen(false)}
                invoice={currentInvoice}
            />
        </div>
    );
}
