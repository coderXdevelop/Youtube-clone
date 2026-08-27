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
    ShieldAlert,
    Lock,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Smartphone,
    Globe,
    Laptop,
    KeyRound,
    ArrowRight,
} from "lucide-react";
import axiosInstance from "@/lib/AxiosInstance";

export interface OtpChallengeData {
    challengeId: string;
    emailMasked: string;
    reason: string;
    testOtp?: string;
    deviceInfo?: {
        browser?: string;
        os?: string;
        deviceType?: string;
        ip?: string;
        location?: string;
    };
}

interface LoginSecurityOtpModalProps {
    isOpen: boolean;
    onClose: () => void;
    challengeData: OtpChallengeData | null;
    onSuccess: (userDoc: any, appliedTheme?: string) => void;
}

export default function LoginSecurityOtpModal({
    isOpen,
    onClose,
    challengeData,
    onSuccess,
}: LoginSecurityOtpModalProps) {
    const [otp, setOtp] = useState("");
    const [trustDevice, setTrustDevice] = useState(true);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [activeTestOtp, setActiveTestOtp] = useState<string | undefined>(challengeData?.testOtp);
    const [countdown, setCountdown] = useState(600); // 10 mins

    useEffect(() => {
        if (challengeData?.testOtp) {
            setActiveTestOtp(challengeData.testOtp);
        }
    }, [challengeData]);

    useEffect(() => {
        if (!isOpen) {
            setOtp("");
            setErrorMessage(null);
            setCountdown(600);
            return;
        }

        const timer = setInterval(() => {
            setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? "0" : ""}${s}`;
    };

    const handleVerify = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!challengeData?.challengeId) return;

        if (otp.trim().length !== 6) {
            setErrorMessage("Please enter a valid 6-digit security code.");
            return;
        }

        setLoading(true);
        setErrorMessage(null);

        try {
            const res = await axiosInstance.post("/api/user/verify-login-otp", {
                challengeId: challengeData.challengeId,
                otp: otp.trim(),
                trustDevice,
                trustDays: 30,
            });

            if (res.data?.success && res.data?.result) {
                onSuccess(res.data.result, res.data.appliedTheme);
                onClose();
            } else {
                setErrorMessage(res.data?.message || "OTP verification failed.");
            }
        } catch (err: unknown) {
            const errObj =
                err && typeof err === "object" && "response" in err
                    ? (err as { response?: { data?: { message?: string } } }).response
                    : null;
            setErrorMessage(errObj?.data?.message || "Invalid or expired OTP code.");
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (!challengeData?.challengeId || resending) return;

        setResending(true);
        setErrorMessage(null);

        try {
            const res = await axiosInstance.post("/api/user/resend-login-otp", {
                challengeId: challengeData.challengeId,
            });

            if (res.data?.success) {
                if (res.data.testOtp) {
                    setActiveTestOtp(res.data.testOtp);
                }
                setCountdown(600);
            }
        } catch (err: unknown) {
            const errObj =
                err && typeof err === "object" && "response" in err
                    ? (err as { response?: { data?: { message?: string } } }).response
                    : null;
            setErrorMessage(errObj?.data?.message || "Failed to resend verification code.");
        } finally {
            setResending(false);
        }
    };

    const handleUseTestOtp = () => {
        if (activeTestOtp) {
            setOtp(activeTestOtp);
        }
    };

    if (!challengeData) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-6 overflow-hidden">
                {/* Header */}
                <DialogHeader className="border-b border-gray-100 dark:border-zinc-800 pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                                <ShieldAlert className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100">
                                    Security Verification
                                </DialogTitle>
                                <p className="text-[11px] text-gray-500">
                                    New device or location detected
                                </p>
                            </div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            <Lock className="w-3 h-3" />
                            2FA Required
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

                {/* Detected Login Details */}
                <div className="p-3.5 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-200/80 dark:border-zinc-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1.5 font-medium">
                            <Laptop className="w-3.5 h-3.5 text-indigo-500" />
                            Device & Browser:
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-gray-200">
                            {challengeData.deviceInfo?.browser || "Browser"} on{" "}
                            {challengeData.deviceInfo?.os || "Device"}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1.5 font-medium">
                            <Globe className="w-3.5 h-3.5 text-indigo-500" />
                            Location & IP:
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-gray-200">
                            {challengeData.deviceInfo?.location || "India"} (
                            {challengeData.deviceInfo?.ip || "127.0.0.1"})
                        </span>
                    </div>
                    <div className="pt-1 border-t border-gray-200/60 dark:border-zinc-700/60 flex items-center justify-between text-[11px] text-gray-500">
                        <span>Code sent to:</span>
                        <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                            {challengeData.emailMasked}
                        </span>
                    </div>
                </div>

                {/* Sandbox Test OTP Auto-Fill Banner */}
                {activeTestOtp && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200">
                        <div className="flex items-center gap-1.5">
                            <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                            <span>
                                Sandbox OTP:{" "}
                                <strong className="font-mono tracking-wider font-bold">
                                    {activeTestOtp}
                                </strong>
                            </span>
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={handleUseTestOtp}
                            className="h-7 text-[11px] font-bold bg-amber-200/70 hover:bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:hover:bg-amber-900 dark:text-amber-100"
                        >
                            Auto-Fill
                        </Button>
                    </div>
                )}

                {/* OTP Input Form */}
                <form onSubmit={handleVerify} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                            Enter 6-Digit Verification Code
                        </label>
                        <input
                            type="text"
                            maxLength={6}
                            value={otp}
                            autoFocus
                            onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                            placeholder="000000"
                            className="w-full text-center tracking-[0.6em] font-mono text-2xl font-black bg-gray-50 dark:bg-zinc-800 border-2 border-gray-200 dark:border-zinc-700 focus:border-indigo-600 dark:focus:border-indigo-500 rounded-xl py-2.5 text-gray-900 dark:text-gray-100 focus:outline-none transition-all"
                        />
                        <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                            <span>Code expires in: {formatTime(countdown)}</span>
                            <button
                                type="button"
                                onClick={handleResendOtp}
                                disabled={resending}
                                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline disabled:opacity-50 cursor-pointer"
                            >
                                {resending ? "Resending..." : "Resend Code"}
                            </button>
                        </div>
                    </div>

                    {/* Trust Device Checkbox */}
                    <div className="flex items-center gap-2 pt-1">
                        <input
                            type="checkbox"
                            id="trustDeviceCheck"
                            checked={trustDevice}
                            onChange={(e) => setTrustDevice(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                        />
                        <label
                            htmlFor="trustDeviceCheck"
                            className="text-xs text-gray-700 dark:text-gray-300 cursor-pointer select-none font-medium"
                        >
                            Trust this browser and device for 30 days
                        </label>
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            disabled={loading}
                            className="text-xs text-gray-500 w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={loading || otp.length !== 6}
                            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex-1 h-10 rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>Verifying Security Code...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Verify & Sign In</span>
                                    <ArrowRight className="w-4 h-4 ml-1" />
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
