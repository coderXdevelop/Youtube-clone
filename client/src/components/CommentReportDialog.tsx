import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Flag, ShieldAlert, CheckCircle2 } from "lucide-react";
import axiosInstance from "@/lib/AxiosInstance";
import { useUser } from "@/lib/AuthContext";
import axios from "axios";

interface CommentReportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    commentId: string | null;
    commentAuthor: string;
    commentText: string;
}

const REPORT_REASONS = [
    { value: "spam", label: "Spam or misleading content", desc: "Commercial spam, repetitive text, or scams" },
    { value: "harassment", label: "Harassment or bullying", desc: "Targeted threats, personal attacks, or intimidation" },
    { value: "hate_speech", label: "Hate speech or offensive content", desc: "Slurs, hateful symbols, or attacks on identity" },
    { value: "malicious_links", label: "Malicious links / Phishing", desc: "Dangerous URLs, suspicious redirects, or malware" },
    { value: "misinformation", label: "Misinformation", desc: "Harmful false or misleading claims" },
    { value: "other", label: "Other issue", desc: "Any other violation of community guidelines" },
];

const CommentReportDialog = ({
    isOpen,
    onClose,
    commentId,
    commentAuthor,
    commentText,
}: CommentReportDialogProps) => {
    const { user } = useUser();
    const [selectedReason, setSelectedReason] = useState("spam");
    const [details, setDetails] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleSubmitReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentId || !user?._id) {
            setStatusMessage({ type: "error", text: "You must be signed in to submit a report." });
            return;
        }

        setIsSubmitting(true);
        setStatusMessage(null);

        try {
            const res = await axiosInstance.post(`/api/comment/report/${commentId}`, {
                userid: user._id,
                username: user.name || "Anonymous",
                reason: selectedReason,
                details: details.trim(),
            });

            if (res.data?.success) {
                setStatusMessage({
                    type: "success",
                    text: res.data.message || "Report submitted successfully for administrator review.",
                });
                setTimeout(() => {
                    onClose();
                    setStatusMessage(null);
                    setDetails("");
                }, 1800);
            }
        } catch (err: unknown) {
            let msg = "Failed to submit report. Please try again.";
            if (axios.isAxiosError(err) && err.response?.data?.message) {
                msg = err.response.data.message;
            }
            setStatusMessage({ type: "error", text: msg });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-6">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <Flag className="w-5 h-5" />
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Report Comment
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <div className="p-3 bg-gray-50 dark:bg-zinc-800/60 rounded-lg text-xs text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-zinc-800">
                    <span className="font-medium text-gray-800 dark:text-gray-200">Comment by @{commentAuthor}:</span>
                    <p className="line-clamp-2 mt-1 italic text-gray-500 dark:text-gray-400">
                        &ldquo;{commentText}&rdquo;
                    </p>
                </div>

                {statusMessage ? (
                    <div
                        className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                            statusMessage.type === "success"
                                ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                                : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                        }`}
                    >
                        {statusMessage.type === "success" ? (
                            <CheckCircle2 className="w-5 h-5 shrink-0 text-green-600 dark:text-green-400" />
                        ) : (
                            <ShieldAlert className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
                        )}
                        <span>{statusMessage.text}</span>
                    </div>
                ) : (
                    <form onSubmit={handleSubmitReport} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                Select a Reason
                            </Label>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {REPORT_REASONS.map((r) => (
                                    <label
                                        key={r.value}
                                        className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                                            selectedReason === r.value
                                                ? "border-red-500 bg-red-50/40 dark:bg-red-950/20 text-gray-900 dark:text-gray-100"
                                                : "border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/40 text-gray-700 dark:text-gray-300"
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="reportReason"
                                            value={r.value}
                                            checked={selectedReason === r.value}
                                            onChange={() => setSelectedReason(r.value)}
                                            className="mt-0.5 accent-red-600"
                                        />
                                        <div>
                                            <p className="text-sm font-medium leading-none">{r.label}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{r.desc}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                Additional Details (Optional)
                            </Label>
                            <Textarea
                                placeholder="Provide more context for our moderation team..."
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                className="min-h-[70px] text-xs resize-none"
                                maxLength={300}
                            />
                        </div>

                        <DialogFooter className="flex gap-2 justify-end pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={isSubmitting}
                                className="text-xs bg-red-600 hover:bg-red-700 text-white"
                            >
                                {isSubmitting ? "Submitting..." : "Submit Report"}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default CommentReportDialog;
