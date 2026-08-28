"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    ShieldCheck,
    ShieldAlert,
    Lock,
    Laptop,
    Smartphone,
    Tablet,
    Globe,
    Clock,
    Sun,
    Moon,
    Sparkles,
    Trash2,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Calendar,
    KeyRound,
    UserCheck,
    Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/lib/AxiosInstance";
import { useUser } from "@/lib/AuthContext";
import { useEnvironment, computeCurrentIstTheme } from "@/lib/EnvironmentContext";
import { format } from "date-fns";

interface TrustedDevice {
    deviceid: string;
    devicename: string;
    browser: string;
    browserversion?: string;
    os: string;
    devicetype: string;
    devicemodel?: string;
    ipaddress: string;
    city?: string;
    state?: string;
    country?: string;
    location?: string;
    trustedat: string;
    expiresat: string;
    lastactive?: string;
}

interface LoginRecord {
    _id: string;
    ipaddress: string;
    browser: string;
    browserversion?: string;
    os: string;
    devicetype: string;
    devicemodel?: string;
    city: string;
    state: string;
    country: string;
    status: "success" | "otp_required" | "otp_failed" | "blocked";
    autothemeapplied: "light" | "dark";
    istrusteddevice: boolean;
    failurereason?: string;
    logintimestamp: string;
}

export default function AccountSecurityContent() {
    const { user } = useUser();
    const { themePreference, setThemePreference, theme } = useEnvironment();

    const [loading, setLoading] = useState(true);
    const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
    const [loginHistory, setLoginHistory] = useState<LoginRecord[]>([]);
    const [activeThemePref, setActiveThemePref] = useState<"auto" | "light" | "dark">("auto");
    const [feedbackMessage, setFeedbackMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    const loadSecurityData = useCallback(async () => {
        if (!user?._id) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const res = await axiosInstance.get(`/api/user/security/${user._id}`);
            if (res.data?.success) {
                setTrustedDevices(res.data.trustedDevices || []);
                setLoginHistory(res.data.loginHistory || []);
                if (res.data.user?.themepreference) {
                    setActiveThemePref(res.data.user.themepreference);
                }
            }
        } catch (error) {
            console.error("Failed to load security info:", error);
        } finally {
            setLoading(false);
        }
    }, [user?._id]);

    useEffect(() => {
        loadSecurityData();
    }, [loadSecurityData]);

    const handleThemeChange = async (pref: "auto" | "light" | "dark") => {
        setActiveThemePref(pref);
        await setThemePreference(pref, user?._id);
        setFeedbackMessage({
            type: "success",
            text: `Theme preference set to ${
                pref === "auto" ? "Time-Based Automatic (IST)" : `${pref.toUpperCase()} mode`
            }.`,
        });
        setTimeout(() => setFeedbackMessage(null), 3000);
    };

    const handleRevokeDevice = async (deviceId: string) => {
        if (!user?._id) return;
        if (!confirm("Are you sure you want to revoke this trusted device? The next login from this device will require OTP verification.")) {
            return;
        }

        try {
            const res = await axiosInstance.post("/api/user/revoke-device", {
                userId: user._id,
                deviceId,
            });
            if (res.data?.success) {
                setTrustedDevices(res.data.trustedDevices || []);
                setFeedbackMessage({
                    type: "success",
                    text: "Trusted device revoked successfully.",
                });
                setTimeout(() => setFeedbackMessage(null), 3000);
            }
        } catch (err) {
            console.error("Error revoking device:", err);
            setFeedbackMessage({
                type: "error",
                text: "Failed to revoke device.",
            });
        }
    };

    const istThemeCalculated = computeCurrentIstTheme();

    if (!user) {
        return (
            <div className="py-20 text-center space-y-4 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-900">
                    <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Sign In Required
                </h2>
                <p className="text-xs text-gray-500">
                    Please sign in to manage your account security, trusted devices, login history, and theme settings.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Header Banner */}
            <div className="bg-zinc-900 border border-zinc-800 text-white rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/10 text-zinc-200">
                            <ShieldCheck className="w-4 h-4 text-white" />
                            <span>Account Protection</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            Account Security & Sessions
                        </h1>
                        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                            Manage your time-based personalized theme, 2FA OTP verification on unfamiliar devices, active sessions, and audit login history.
                        </p>
                    </div>

                    <div className="bg-zinc-800/80 backdrop-blur-md p-4 rounded-2xl border border-zinc-700 min-w-[240px] space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-300">2FA Security Status:</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-zinc-950 uppercase">
                                ACTIVE
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-zinc-300 border-t border-zinc-700 pt-2">
                            <span>Trusted Devices:</span>
                            <span className="font-bold text-white">{trustedDevices.length} registered</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-zinc-300">
                            <span>Active Theme Mode:</span>
                            <span className="font-bold text-white capitalize">{theme} mode</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Feedback Alert */}
            {feedbackMessage && (
                <div
                    className={`p-4 rounded-2xl text-xs border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
                        feedbackMessage.type === "success"
                            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700"
                            : "bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 border-red-200 dark:border-red-800"
                    }`}
                >
                    {feedbackMessage.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-zinc-900 dark:text-zinc-100 flex-shrink-0" />
                    ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                    )}
                    <span className="font-medium">{feedbackMessage.text}</span>
                </div>
            )}

            {/* 1. Theme Personalization Section */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <div className="space-y-1">
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-red-600" />
                            Personalized Theme Preferences
                        </h2>
                        <p className="text-xs text-zinc-500">
                            Configure automatic time-based theme adaptation or choose your preferred constant mode.
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                        <Clock className="w-3.5 h-3.5" />
                        5:00 AM – 12:00 PM IST: Light Mode
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Auto (Time-Based) */}
                    <button
                        type="button"
                        onClick={() => handleThemeChange("auto")}
                        className={`p-5 rounded-2xl border text-left space-y-3 transition-all cursor-pointer ${
                            activeThemePref === "auto"
                                ? "border-zinc-900 bg-zinc-50 dark:border-white dark:bg-zinc-800 shadow-sm ring-1 ring-zinc-900 dark:ring-white"
                                : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center font-bold">
                                <Clock className="w-5 h-5" />
                            </div>
                            {activeThemePref === "auto" && (
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-600 text-white">
                                    Active
                                </span>
                            )}
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                Automatic (IST Time)
                            </h4>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                                Automatically switches to Light theme from 5:00 AM to 12:00 PM IST, and Dark theme during other times.
                            </p>
                        </div>
                        <div className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 pt-1">
                            Current IST Evaluation: <strong className="uppercase">{istThemeCalculated}</strong>
                        </div>
                    </button>

                    {/* Light Theme */}
                    <button
                        type="button"
                        onClick={() => handleThemeChange("light")}
                        className={`p-5 rounded-2xl border text-left space-y-3 transition-all cursor-pointer ${
                            activeThemePref === "light"
                                ? "border-zinc-900 bg-zinc-50 dark:border-white dark:bg-zinc-800 shadow-sm ring-1 ring-zinc-900 dark:ring-white"
                                : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center font-bold">
                                <Sun className="w-5 h-5" />
                            </div>
                            {activeThemePref === "light" && (
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-600 text-white">
                                    Active
                                </span>
                            )}
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                Always Light Theme
                            </h4>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                                Keep the bright, crisp light theme active at all times regardless of login time.
                            </p>
                        </div>
                    </button>

                    {/* Dark Theme */}
                    <button
                        type="button"
                        onClick={() => handleThemeChange("dark")}
                        className={`p-5 rounded-2xl border text-left space-y-3 transition-all cursor-pointer ${
                            activeThemePref === "dark"
                                ? "border-zinc-900 bg-zinc-50 dark:border-white dark:bg-zinc-800 shadow-sm ring-1 ring-zinc-900 dark:ring-white"
                                : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center font-bold">
                                <Moon className="w-5 h-5" />
                            </div>
                            {activeThemePref === "dark" && (
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-600 text-white">
                                    Active
                                </span>
                            )}
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                Always Dark Theme
                            </h4>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                                Keep sleek, eye-friendly dark mode active across all sessions and devices.
                            </p>
                        </div>
                    </button>
                </div>
            </div>

            {/* 2. Trusted Devices Management Section */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <div className="space-y-1">
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <Laptop className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                            Trusted Devices & Browsers
                        </h2>
                        <p className="text-xs text-zinc-500">
                            Logins from these recognized devices bypass 2FA OTP security challenges for 30 days.
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={loadSecurityData}
                        disabled={loading}
                        className="text-xs h-8 cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>

                {trustedDevices.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-500">
                        No trusted devices registered yet. Logins from new browsers will prompt for OTP verification.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {trustedDevices.map((dev, idx) => (
                            <div
                                key={dev.deviceid || idx}
                                className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 space-y-3 flex flex-col justify-between"
                            >
                                <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
                                                {dev.devicetype === "Mobile" ? (
                                                    <Smartphone className="w-4 h-4" />
                                                ) : dev.devicetype === "Tablet" ? (
                                                    <Tablet className="w-4 h-4" />
                                                ) : (
                                                    <Laptop className="w-4 h-4" />
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                                    {dev.devicename || `${dev.browser} on ${dev.os}`}
                                                </h4>
                                                <span className="text-[11px] text-zinc-500 font-mono">
                                                    IP: {dev.ipaddress || "127.0.0.1"}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                                            Trusted
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-600 dark:text-zinc-400 pt-1 border-t border-zinc-200 dark:border-zinc-700">
                                        <div>
                                            <span className="text-zinc-400 block text-[10px]">Location</span>
                                            <span>{dev.location || `${dev.city || "Bengaluru"}, ${dev.country || "India"}`}</span>
                                        </div>
                                        <div>
                                            <span className="text-zinc-400 block text-[10px]">Trusted Until</span>
                                            <span>
                                                {dev.expiresat
                                                    ? format(new Date(dev.expiresat), "MMM d, yyyy")
                                                    : "30 Days"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRevokeDevice(dev.deviceid)}
                                    className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 w-full justify-center cursor-pointer"
                                >
                                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                    Revoke Trust
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 3. Detailed Security Login History Audit Log */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 space-y-6 shadow-sm">
                <div className="space-y-1 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                        Detailed Login History & Security Audit Log
                    </h2>
                    <p className="text-xs text-zinc-500">
                        Complete chronological record of login timestamps, IP addresses, browsers, OS, and verification status.
                    </p>
                </div>

                {loginHistory.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-500">
                        No login records found.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-gray-400">
                                    <th className="py-3 px-3 font-semibold">Timestamp</th>
                                    <th className="py-3 px-3 font-semibold">Browser & OS</th>
                                    <th className="py-3 px-3 font-semibold">Device</th>
                                    <th className="py-3 px-3 font-semibold">IP Address</th>
                                    <th className="py-3 px-3 font-semibold">Location</th>
                                    <th className="py-3 px-3 font-semibold text-center">Theme</th>
                                    <th className="py-3 px-3 font-semibold text-center">Security Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-gray-800 dark:text-gray-200">
                                {loginHistory.map((rec) => (
                                    <tr key={rec._id} className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                                        <td className="py-3.5 px-3 whitespace-nowrap text-gray-700 dark:text-gray-300 font-medium">
                                            {format(new Date(rec.logintimestamp || Date.now()), "MMM d, yyyy h:mm a")}
                                        </td>
                                        <td className="py-3.5 px-3">
                                            <span className="font-semibold">{rec.browser}</span>
                                            <span className="text-gray-400 text-[11px] block">{rec.os}</span>
                                        </td>
                                        <td className="py-3.5 px-3">
                                            <span>{rec.devicetype}</span>
                                            {rec.devicemodel && (
                                                <span className="text-gray-400 text-[10px] block font-mono">
                                                    {rec.devicemodel}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-3 font-mono text-[11px]">
                                            {rec.ipaddress}
                                        </td>
                                        <td className="py-3.5 px-3 whitespace-nowrap">
                                            {rec.city}, {rec.country || "India"}
                                        </td>
                                        <td className="py-3.5 px-3 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                rec.autothemeapplied === "light"
                                                    ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
                                                    : "bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300"
                                            }`}>
                                                {rec.autothemeapplied || "dark"}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-3 text-center">
                                            <span
                                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                    rec.status === "success"
                                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                                                        : rec.status === "otp_required"
                                                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                                                        : "bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300"
                                                }`}
                                            >
                                                {rec.status === "success"
                                                    ? "Success"
                                                    : rec.status === "otp_required"
                                                    ? "OTP Challenged"
                                                    : "OTP Failed"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
