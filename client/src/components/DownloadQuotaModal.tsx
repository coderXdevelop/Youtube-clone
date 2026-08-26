import React from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Download, Crown, Zap, Clock, ShieldAlert, Sparkles } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface DownloadQuotaModalProps {
    isOpen: boolean;
    onClose: () => void;
    plan: string;
    limit: number;
    usedToday: number;
    nextResetTime?: string | Date;
}

const DownloadQuotaModal = ({
    isOpen,
    onClose,
    plan,
    limit,
    usedToday,
    nextResetTime,
}: DownloadQuotaModalProps) => {
    const resetTimeFormatted = nextResetTime
        ? formatDistanceToNow(new Date(nextResetTime), { addSuffix: true })
        : "at midnight UTC";

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-6">
                <DialogHeader className="space-y-2 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 flex items-center justify-center mx-auto shadow-sm">
                        <Crown className="w-6 h-6" />
                    </div>
                    <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        Daily Download Limit Reached
                    </DialogTitle>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        You have used all <strong className="text-gray-900 dark:text-gray-100">{usedToday} / {limit}</strong> downloads for today on your <span className="font-semibold text-indigo-600 dark:text-indigo-400">{plan} Plan</span>.
                    </p>
                </DialogHeader>

                {/* Status & Reset info */}
                <div className="bg-gray-50 dark:bg-zinc-800/40 rounded-xl p-4 border border-gray-100 dark:border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            Quota resets:
                        </span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                            {resetTimeFormatted}
                        </span>
                    </div>

                    <div className="w-full bg-gray-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full w-full rounded-full" />
                    </div>

                    <p className="text-[11px] text-gray-500 leading-relaxed">
                        Tip: You can re-download any video you downloaded in the last 24 hours without consuming your daily quota.
                    </p>
                </div>

                {/* Upgrade Highlights */}
                <div className="p-3.5 bg-gradient-to-br from-indigo-50/60 to-purple-50/60 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Unlock Higher Daily Limits:</span>
                    </div>
                    <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                        <li className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <strong>Bronze:</strong> 5 downloads / day
                        </li>
                        <li className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            <strong>Silver:</strong> 15 downloads / day + Full HD
                        </li>
                        <li className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                            <strong>Gold:</strong> Unlimited downloads + 4K quality
                        </li>
                    </ul>
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="text-xs w-full sm:w-auto"
                    >
                        Maybe Later
                    </Button>
                    <Link
                        href="/subscriptions"
                        onClick={onClose}
                        className="inline-flex items-center justify-center rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-4 py-2 w-full sm:w-auto transition-colors"
                    >
                        <Zap className="w-3.5 h-3.5 mr-1" />
                        Upgrade Subscription
                    </Link>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default DownloadQuotaModal;
