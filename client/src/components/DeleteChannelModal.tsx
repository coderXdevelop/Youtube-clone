"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { AlertTriangle, Trash2, ShieldAlert, CheckCircle2, Loader2 } from "lucide-react";
import axiosInstance from "@/lib/AxiosInstance";
import { useUser } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";

interface DeleteChannelModalProps {
    isOpen: boolean;
    onClose: () => void;
    channelId: string;
    channelName: string;
    userEmail?: string;
    onSuccess?: (updatedUser: any) => void;
}

export default function DeleteChannelModal({
    isOpen,
    onClose,
    channelId,
    channelName,
    userEmail,
    onSuccess,
}: DeleteChannelModalProps) {
    const { user, login } = useUser();
    const router = useRouter();

    const [confirmInput, setConfirmInput] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const targetDisplayName = channelName || user?.name || "My Channel";
    const isConfirmationValid =
        confirmInput.trim().toLowerCase() === targetDisplayName.trim().toLowerCase() ||
        (userEmail && confirmInput.trim().toLowerCase() === userEmail.trim().toLowerCase()) ||
        confirmInput.trim().toUpperCase() === "DELETE";

    const handleClose = () => {
        if (isDeleting) return;
        setConfirmInput("");
        setErrorMessage(null);
        setSuccessMessage(null);
        onClose();
    };

    const handleDelete = async () => {
        if (!user?._id || !isConfirmationValid) return;

        setIsDeleting(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        try {
            const response = await axiosInstance.delete(`/api/user/channel/${channelId}`, {
                data: {
                    userId: user._id,
                    confirmName: confirmInput.trim(),
                },
                headers: {
                    "x-user-id": user._id,
                },
            });

            if (response.data?.success) {
                setSuccessMessage("Channel and all data have been permanently deleted.");

                // Update context user so channel name is cleared across the entire app
                if (response.data?.user) {
                    login(response.data.user);
                } else if (user) {
                    login({
                        ...user,
                        channelname: "",
                        discription: "",
                        subscribersCount: 0,
                    });
                }

                if (onSuccess) {
                    onSuccess(response.data.user);
                }

                // Redirect after brief delay
                setTimeout(() => {
                    handleClose();
                    router.push("/");
                }, 1200);
            } else {
                setErrorMessage(response.data?.message || "Failed to delete channel.");
            }
        } catch (error: any) {
            console.error("Delete channel error:", error);
            const msg =
                error.response?.data?.message ||
                error.message ||
                "Failed to delete channel. Please check your connection and try again.";
            setErrorMessage(msg);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-lg bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-950/60 shadow-2xl overflow-hidden p-0">
                {/* Red warning header banner */}
                <div className="bg-red-50 dark:bg-red-950/40 border-b border-red-100 dark:border-red-900/50 p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-2xl text-red-600 dark:text-red-400 shrink-0">
                            <ShieldAlert className="w-7 h-7" />
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-xl font-bold text-red-900 dark:text-red-200">
                                Delete Channel Permanently?
                            </DialogTitle>
                            <DialogDescription className="text-sm text-red-700 dark:text-red-300">
                                This action is <strong className="font-bold underline">irreversible</strong> and will permanently wipe your creator profile.
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {/* Detailed consequence list */}
                    <div className="rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700/60 p-4 space-y-2.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <span>What will be deleted:</span>
                        </div>
                        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1.5 list-disc list-inside">
                            <li>All uploaded videos, thumbnail images, and transcoded streams</li>
                            <li>All viewer comments, replies, and community interactions on your videos</li>
                            <li>All likes, watch history, and download records associated with your videos</li>
                            <li>Your channel link will be removed from all users&apos; subscribed feeds</li>
                        </ul>
                    </div>

                    {/* Authentication / Identity Confirmation Field */}
                    <div className="space-y-2">
                        <Label htmlFor="confirmNameInput" className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                            To confirm, please type your channel name (<span className="text-red-600 font-mono">{targetDisplayName}</span>) or <span className="font-mono text-red-600">DELETE</span>:
                        </Label>
                        <Input
                            id="confirmNameInput"
                            type="text"
                            placeholder={targetDisplayName}
                            value={confirmInput}
                            onChange={(e) => setConfirmInput(e.target.value)}
                            disabled={isDeleting || Boolean(successMessage)}
                            className="text-sm border-gray-300 dark:border-zinc-700 focus-visible:ring-red-500 font-medium"
                            autoComplete="off"
                        />
                    </div>

                    {/* Error and Success Feedback */}
                    {errorMessage && (
                        <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-xs font-medium text-red-600 dark:text-red-400">
                            {errorMessage}
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-lg text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            {successMessage}
                        </div>
                    )}
                </div>

                <DialogFooter className="px-6 py-4 bg-gray-50 dark:bg-zinc-800/30 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between sm:justify-between gap-3">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleClose}
                        disabled={isDeleting}
                        className="text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-800"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleDelete}
                        disabled={!isConfirmationValid || isDeleting || Boolean(successMessage)}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Deleting Everything...</span>
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-4 h-4" />
                                <span>Permanently Delete Channel</span>
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
