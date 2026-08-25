import React, { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { History, Clock, FileText } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import axiosInstance from "@/lib/AxiosInstance";

interface CommentHistoryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    commentId: string | null;
    authorName: string;
}

interface HistoryItem {
    body: string;
    editedat: string;
}

interface HistoryData {
    originalbody: string;
    commentedon: string;
    isedited: boolean;
    edithistory: HistoryItem[];
}

const CommentHistoryDialog = ({
    isOpen,
    onClose,
    commentId,
    authorName,
}: CommentHistoryDialogProps) => {
    const [historyData, setHistoryData] = useState<HistoryData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !commentId) return;

        const fetchHistory = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axiosInstance.get(`/api/comment/history/${commentId}`);
                setHistoryData(res.data);
            } catch {
                setError("Failed to load comment history.");
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [isOpen, commentId]);

    const formatTimestamp = (dateStr?: string) => {
        if (!dateStr) return "";
        try {
            const date = new Date(dateStr);
            return `${formatDistanceToNow(date)} ago (${format(date, "MMM d, yyyy h:mm a")})`;
        } catch {
            return dateStr;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-6">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <History className="w-5 h-5" />
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Edit History — @{authorName}
                        </DialogTitle>
                    </div>
                </DialogHeader>

                {loading ? (
                    <div className="py-8 text-center text-sm text-gray-500">Loading edit revisions...</div>
                ) : error ? (
                    <div className="py-6 text-center text-sm text-red-500">{error}</div>
                ) : (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                        {/* Original Version */}
                        <div className="p-3.5 bg-gray-50 dark:bg-zinc-800/40 rounded-xl border border-gray-100 dark:border-zinc-800">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Original Post: {formatTimestamp(historyData?.commentedon)}</span>
                            </div>
                            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                                {historyData?.originalbody}
                            </p>
                        </div>

                        {/* Past Revisions */}
                        {historyData?.edithistory && historyData.edithistory.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                    Previous Revisions ({historyData.edithistory.length})
                                </h4>
                                {historyData.edithistory.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="p-3 bg-blue-50/30 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/40"
                                    >
                                        <div className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">
                                            <FileText className="w-3.5 h-3.5" />
                                            <span>Revision #{idx + 1} — {formatTimestamp(item.editedat)}</span>
                                        </div>
                                        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                                            {item.body}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter className="flex justify-end pt-2">
                    <Button variant="ghost" onClick={onClose} className="text-xs">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CommentHistoryDialog;
