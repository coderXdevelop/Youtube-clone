import React, { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Shield, Check, EyeOff, Trash2, AlertTriangle, User, RefreshCw } from "lucide-react";
import axiosInstance from "@/lib/AxiosInstance";
import { useUser } from "@/lib/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface AdminModerationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    videoId?: string;
    onCommentModerated?: () => void;
}

interface PopulatedComment {
    _id: string;
    commentbody: string;
    usercommented: string;
    reportcount: number;
}

interface ReportItem {
    _id: string;
    commentid: PopulatedComment | string | null;
    videoid: string;
    reportedbyname: string;
    reason: string;
    details: string;
    commentcontent: string;
    createdAt: string;
}

const AdminModerationDialog = ({
    isOpen,
    onClose,
    videoId,
    onCommentModerated,
}: AdminModerationDialogProps) => {
    const { user } = useUser();
    const [reports, setReports] = useState<ReportItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);

    const fetchFlagged = async () => {
        if (!user?._id) return;
        setLoading(true);
        setFeedback(null);
        try {
            const params = new URLSearchParams();
            if (videoId) params.append("videoid", videoId);
            if (user?._id) params.append("userId", user._id);

            const res = await axiosInstance.get(`/api/comment/admin/flagged?${params.toString()}`);
            if (res.data?.reports) {
                setReports(res.data.reports);
            }
        } catch (err) {
            console.error("Failed to fetch reports:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let ignore = false;
        if (isOpen && user?._id) {
            const params = new URLSearchParams();
            if (videoId) params.append("videoid", videoId);
            if (user?._id) params.append("userId", user._id);

            axiosInstance.get(`/api/comment/admin/flagged?${params.toString()}`)
                .then((res) => {
                    if (!ignore && res.data?.reports) {
                        setReports(res.data.reports);
                    }
                })
                .catch((err) => {
                    console.error("Failed to fetch reports:", err);
                })
                .finally(() => {
                    if (!ignore) setLoading(false);
                });
        }
        return () => {
            ignore = true;
        };
    }, [isOpen, videoId, user?._id]);

    const handleAction = async (
        commentId: string,
        reportId: string,
        action: "dismiss" | "hide" | "delete"
    ) => {
        setActionLoadingId(reportId);
        try {
            await axiosInstance.post(`/api/comment/admin/review/${commentId}`, {
                action,
                reportid: reportId,
                reviewerid: user?._id,
                videoid: videoId,
            });
            setReports((prev) => prev.filter((r) => r._id !== reportId));
            setFeedback(`Report marked as ${action}ed.`);
            if (onCommentModerated) onCommentModerated();
        } catch {
            setFeedback("Failed to update report status.");
        } finally {
            setActionLoadingId(null);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-6">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                            <Shield className="w-5 h-5" />
                            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Channel Moderation Hub
                            </DialogTitle>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={fetchFlagged}
                            disabled={loading}
                            className="h-8 px-2 text-gray-500"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>
                </DialogHeader>

                {feedback && (
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs rounded-lg border border-blue-200 dark:border-blue-900">
                        {feedback}
                    </div>
                )}

                {loading ? (
                    <div className="py-12 text-center text-sm text-gray-500">Loading flagged reports...</div>
                ) : reports.length === 0 ? (
                    <div className="py-12 text-center space-y-2">
                        <Check className="w-10 h-10 mx-auto text-green-500" />
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            All Clean! No Pending Reports
                        </p>
                        <p className="text-xs text-gray-500">
                            All user reports and flagged comments have been reviewed.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                        {reports.map((r) => {
                            const commentObj = r.commentid;
                            const isPopulated = typeof commentObj === "object" && commentObj !== null;
                            const commentId = isPopulated ? commentObj._id : String(r.commentid || "");
                            const commentContent = r.commentcontent || (isPopulated ? commentObj.commentbody : "");
                            const author = isPopulated ? commentObj.usercommented : "User";

                            return (
                                <div
                                    key={r._id}
                                    className="p-4 bg-gray-50 dark:bg-zinc-800/40 rounded-xl border border-gray-200 dark:border-zinc-800 space-y-2.5"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
                                                <AlertTriangle className="w-3 h-3" />
                                                {r.reason?.toUpperCase()}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                Reported {formatDistanceToNow(new Date(r.createdAt))} ago by @{r.reportedbyname}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Reported Comment Content */}
                                    <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">
                                            <User className="w-3 h-3" />
                                            <span>Author: @{author}</span>
                                        </div>
                                        <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-sans">
                                            {commentContent || "[Content unavailable]"}
                                        </p>
                                    </div>

                                    {r.details && (
                                        <p className="text-xs text-gray-500 italic">
                                            Reporter notes: &ldquo;{r.details}&rdquo;
                                        </p>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-end gap-2 pt-1">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleAction(commentId, r._id, "dismiss")}
                                            disabled={actionLoadingId === r._id}
                                            className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/40 border-green-200 dark:border-green-800"
                                        >
                                            <Check className="w-3.5 h-3.5 mr-1" />
                                            Dismiss / Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleAction(commentId, r._id, "hide")}
                                            disabled={actionLoadingId === r._id}
                                            className="h-7 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 border-amber-200 dark:border-amber-800"
                                        >
                                            <EyeOff className="w-3.5 h-3.5 mr-1" />
                                            Hide Comment
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleAction(commentId, r._id, "delete")}
                                            disabled={actionLoadingId === r._id}
                                            className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <DialogFooter className="flex justify-end pt-2">
                    <Button variant="ghost" onClick={onClose} className="text-xs">
                        Close Hub
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AdminModerationDialog;
