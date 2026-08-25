import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import {
    ThumbsUp,
    ThumbsDown,
    MoreVertical,
    Globe,
    MapPin,
    History,
    Edit2,
    Trash2,
    Flag,
    ChevronDown,
    ChevronUp,
    Clock,
    AlertCircle,
    Check,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { formatDistanceToNow, format } from "date-fns";
import axiosInstance from "@/lib/AxiosInstance";
import { useUser } from "@/lib/AuthContext";
import CommentReportDialog from "./CommentReportDialog";
import CommentHistoryDialog from "./CommentHistoryDialog";
import axios from "axios";

export interface CommentData {
    _id: string;
    videoid: string;
    userid: string;
    usercommented: string;
    userimage?: string;
    userlocation?: string;
    commentbody: string;
    commentedon: string;
    parentcommentid?: string | null;
    replycount?: number;
    likescount?: number;
    dislikescount?: number;
    likes?: string[];
    dislikes?: string[];
    isedited?: boolean;
    editedat?: string;
    isdeleted?: boolean;
    detectedlanguage?: string;
    translations?: Record<string, string>;
    version?: number;
}

interface CommentItemProps {
    comment: CommentData;
    allComments: CommentData[];
    onCommentUpdated: (updated: CommentData) => void;
    onCommentDeleted: (commentId: string, softDeleted?: boolean) => void;
    onReplySubmitted: (newComment: CommentData) => void;
    targetLanguage: string;
}

const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const CommentItem = ({
    comment,
    allComments,
    onCommentUpdated,
    onCommentDeleted,
    onReplySubmitted,
    targetLanguage,
}: CommentItemProps) => {
    const { user } = useUser();

    // Reply state
    const [showReplyBox, setShowReplyBox] = useState(false);
    const [replyText, setReplyText] = useState(`@${comment.usercommented} `);
    const [isSubmittingReply, setIsSubmittingReply] = useState(false);
    const [showReplies, setShowReplies] = useState(false);

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(comment.commentbody);
    const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);
    const [timeLeftMs, setTimeLeftMs] = useState<number>(0);

    // Translation state
    const [isTranslated, setIsTranslated] = useState(false);
    const [translatedText, setTranslatedText] = useState<string | null>(null);
    const [isTranslating, setIsTranslating] = useState(false);
    const [translationError, setTranslationError] = useState<string | null>(null);

    // Reaction state
    const [likesCount, setLikesCount] = useState(comment.likescount || 0);
    const [dislikesCount, setDislikesCount] = useState(comment.dislikescount || 0);
    const [hasLiked, setHasLiked] = useState(
        Boolean(user?._id && comment.likes?.some((id) => id?.toString() === user._id?.toString()))
    );
    const [hasDisliked, setHasDisliked] = useState(
        Boolean(user?._id && comment.dislikes?.some((id) => id?.toString() === user._id?.toString()))
    );

    // Dialogs
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // Calculate edit time window
    const isOwner = Boolean(user?._id && comment.userid?.toString() === user._id?.toString());
    useEffect(() => {
        if (!isOwner || comment.isdeleted) return;

        const updateTimer = () => {
            const commentTime = new Date(comment.commentedon).getTime();
            const elapsed = Date.now() - commentTime;
            const remaining = Math.max(0, EDIT_WINDOW_MS - elapsed);
            setTimeLeftMs(remaining);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 10000);
        return () => clearInterval(interval);
    }, [comment.commentedon, isOwner, comment.isdeleted]);

    const canEdit = isOwner && !comment.isdeleted && timeLeftMs > 0;

    // Filter child replies for this comment
    const childReplies = allComments.filter(
        (c) => c.parentcommentid?.toString() === comment._id?.toString()
    );

    // Format mentions in comment body
    const renderCommentBodyWithMentions = (text: string) => {
        const words = text.split(" ");
        return words.map((word, idx) => {
            if (word.startsWith("@") && word.length > 1) {
                return (
                    <span
                        key={idx}
                        className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer mr-1"
                    >
                        {word}{" "}
                    </span>
                );
            }
            return word + " ";
        });
    };

    // Reaction handlers
    const handleLike = async () => {
        if (!user?._id) return;
        const prevLiked = hasLiked;
        const prevDisliked = hasDisliked;
        const prevLikesCount = likesCount;
        const prevDislikesCount = dislikesCount;

        // Optimistic update
        if (prevLiked) {
            setHasLiked(false);
            setLikesCount(Math.max(0, prevLikesCount - 1));
        } else {
            setHasLiked(true);
            setLikesCount(prevLikesCount + 1);
            if (prevDisliked) {
                setHasDisliked(false);
                setDislikesCount(Math.max(0, prevDislikesCount - 1));
            }
        }

        try {
            const res = await axiosInstance.post(`/api/comment/like/${comment._id}`, {
                userid: user._id,
            });
            if (res.data) {
                setLikesCount(res.data.likescount);
                setDislikesCount(res.data.dislikescount);
                setHasLiked(res.data.hasLiked);
                setHasDisliked(res.data.hasDisliked);
            }
        } catch {
            // Revert on error
            setHasLiked(prevLiked);
            setHasDisliked(prevDisliked);
            setLikesCount(prevLikesCount);
            setDislikesCount(prevDislikesCount);
        }
    };

    const handleDislike = async () => {
        if (!user?._id) return;
        const prevLiked = hasLiked;
        const prevDisliked = hasDisliked;
        const prevLikesCount = likesCount;
        const prevDislikesCount = dislikesCount;

        // Optimistic update
        if (prevDisliked) {
            setHasDisliked(false);
            setDislikesCount(Math.max(0, prevDislikesCount - 1));
        } else {
            setHasDisliked(true);
            setDislikesCount(prevDislikesCount + 1);
            if (prevLiked) {
                setHasLiked(false);
                setLikesCount(Math.max(0, prevLikesCount - 1));
            }
        }

        try {
            const res = await axiosInstance.post(`/api/comment/dislike/${comment._id}`, {
                userid: user._id,
            });
            if (res.data) {
                setLikesCount(res.data.likescount);
                setDislikesCount(res.data.dislikescount);
                setHasLiked(res.data.hasLiked);
                setHasDisliked(res.data.hasDisliked);
            }
        } catch {
            // Revert on error
            setHasLiked(prevLiked);
            setHasDisliked(prevDisliked);
            setLikesCount(prevLikesCount);
            setDislikesCount(prevDislikesCount);
        }
    };

    // Translation toggle
    const handleToggleTranslate = async () => {
        if (isTranslated) {
            setIsTranslated(false);
            return;
        }

        if (translatedText) {
            setIsTranslated(true);
            return;
        }

        setIsTranslating(true);
        setTranslationError(null);
        try {
            const res = await axiosInstance.post(`/api/comment/translate/${comment._id}`, {
                targetLang: targetLanguage,
            });
            if (res.data?.translatedText) {
                setTranslatedText(res.data.translatedText);
                setIsTranslated(true);
            }
        } catch {
            setTranslationError("Translation unavailable. Click to retry.");
        } finally {
            setIsTranslating(false);
        }
    };

    // Edit handler
    const handleSaveEdit = async () => {
        if (!editText.trim()) return;
        setIsSubmittingEdit(true);
        setEditError(null);

        try {
            const res = await axiosInstance.post(`/api/comment/editcomment/${comment._id}`, {
                commentbody: editText.trim(),
                userid: user?._id,
                version: comment.version || 1,
            });

            if (res.data) {
                onCommentUpdated(res.data);
                setIsEditing(false);
                setIsTranslated(false);
                setTranslatedText(null);
            }
        } catch (err: unknown) {
            let msg = "Failed to update comment.";
            if (axios.isAxiosError(err) && err.response?.data?.message) {
                msg = err.response.data.message;
            }
            setEditError(msg);
        } finally {
            setIsSubmittingEdit(false);
        }
    };

    // Delete handler
    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this comment?")) return;
        try {
            const res = await axiosInstance.delete(`/api/comment/deletecomment/${comment._id}`, {
                data: { userid: user?._id },
            });
            onCommentDeleted(comment._id, res.data?.softDeleted);
        } catch {
            console.error("Delete error occurred");
        }
    };

    // Submit Reply
    const handleSubmitReply = async () => {
        if (!user || !replyText.trim()) return;
        setIsSubmittingReply(true);

        try {
            const res = await axiosInstance.post("/api/comment/postcomment", {
                videoid: comment.videoid,
                userid: user._id,
                commentbody: replyText.trim(),
                usercommented: user.name || "Anonymous",
                userimage: user.image || "",
                userlocation: user.location || "",
                parentcommentid: comment._id,
            });

            if (res.data?.comment && res.data.result) {
                onReplySubmitted(res.data.result);
                setReplyText(`@${comment.usercommented} `);
                setShowReplyBox(false);
                setShowReplies(true);
            }
        } catch (err: unknown) {
            console.error("Reply error:", err);
            let msg = "Failed to post reply.";
            if (axios.isAxiosError(err) && err.response?.data?.message) {
                msg = err.response.data.message;
            }
            alert(msg);
        } finally {
            setIsSubmittingReply(false);
        }
    };

    const remainingMinutes = Math.ceil(timeLeftMs / 60000);

    return (
        <div className="flex gap-3 text-gray-900 dark:text-gray-100 group transition-colors">
            {/* User Avatar */}
            <Avatar className="w-9 h-9 shrink-0 ring-1 ring-black/5 dark:ring-white/10">
                <AvatarImage src={comment.userimage || "/placeholder.svg"} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold">
                    {comment.usercommented?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 space-y-1">
                {/* User Header Metadata */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
                        @{comment.usercommented}
                    </span>

                    {/* Location Badge */}
                    {comment.userlocation && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {comment.userlocation}
                        </span>
                    )}

                    {/* Timestamp */}
                    <span
                        className="text-gray-500 dark:text-gray-400"
                        title={format(new Date(comment.commentedon), "PPpp")}
                    >
                        {formatDistanceToNow(new Date(comment.commentedon))} ago
                    </span>

                    {/* Edited Indicator */}
                    {comment.isedited && !comment.isdeleted && (
                        <button
                            onClick={() => setIsHistoryOpen(true)}
                            className="inline-flex items-center gap-0.5 text-gray-400 hover:text-blue-500 hover:underline cursor-pointer"
                            title="Click to view edit history"
                        >
                            <History className="w-3 h-3" />
                            <span>(edited)</span>
                        </button>
                    )}
                </div>

                {/* Comment Body / Editing Box */}
                {isEditing ? (
                    <div className="space-y-2 mt-2">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                Edit window: {remainingMinutes} min remaining
                            </span>
                            <span>{editText.length}/500</span>
                        </div>
                        <Textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            maxLength={500}
                            className="min-h-[75px] text-sm bg-white dark:bg-zinc-900"
                        />
                        {editError && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {editError}
                            </p>
                        )}
                        <div className="flex gap-2 justify-end">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                    setIsEditing(false);
                                    setEditText(comment.commentbody);
                                    setEditError(null);
                                }}
                                disabled={isSubmittingEdit}
                                className="h-8 text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSaveEdit}
                                disabled={!editText.trim() || isSubmittingEdit}
                                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {isSubmittingEdit ? "Saving..." : "Save"}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        <p
                            className={`text-sm leading-relaxed whitespace-pre-wrap ${
                                comment.isdeleted
                                    ? "italic text-gray-400 dark:text-gray-500"
                                    : "text-gray-900 dark:text-gray-100"
                            }`}
                        >
                            {isTranslated && translatedText
                                ? renderCommentBodyWithMentions(translatedText)
                                : renderCommentBodyWithMentions(comment.commentbody)}
                        </p>

                        {/* Translation Controls & Badges */}
                        {!comment.isdeleted && (
                            <div className="flex items-center gap-3 text-xs">
                                <button
                                    onClick={handleToggleTranslate}
                                    disabled={isTranslating}
                                    className="inline-flex items-center gap-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors cursor-pointer"
                                >
                                    <Globe className={`w-3.5 h-3.5 ${isTranslating ? "animate-spin text-blue-500" : ""}`} />
                                    <span>
                                        {isTranslating
                                            ? "Translating..."
                                            : isTranslated
                                            ? "See original"
                                            : `Translate to ${targetLanguage.toUpperCase()}`}
                                    </span>
                                </button>

                                {isTranslated && (
                                    <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                        <Check className="w-3 h-3 text-green-500" />
                                        Translated
                                    </span>
                                )}

                                {translationError && (
                                    <span className="text-[11px] text-red-500">
                                        {translationError}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Actions Toolbar */}
                        {!comment.isdeleted && (
                            <div className="flex items-center gap-4 pt-1 text-gray-600 dark:text-gray-400">
                                {/* Like */}
                                <button
                                    onClick={handleLike}
                                    className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-blue-600 dark:hover:text-blue-400 ${
                                        hasLiked ? "text-blue-600 dark:text-blue-400 font-semibold" : ""
                                    }`}
                                >
                                    <ThumbsUp
                                        className={`w-4 h-4 ${hasLiked ? "fill-blue-600 dark:fill-blue-400" : ""}`}
                                    />
                                    <span>{likesCount > 0 ? likesCount : ""}</span>
                                </button>

                                {/* Dislike */}
                                <button
                                    onClick={handleDislike}
                                    className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-red-600 dark:hover:text-red-400 ${
                                        hasDisliked ? "text-red-600 dark:text-red-400 font-semibold" : ""
                                    }`}
                                >
                                    <ThumbsDown
                                        className={`w-4 h-4 ${hasDisliked ? "fill-red-600 dark:fill-red-400" : ""}`}
                                    />
                                    <span>{dislikesCount > 0 ? dislikesCount : ""}</span>
                                </button>

                                {/* Reply Button */}
                                {user && (
                                    <button
                                        onClick={() => setShowReplyBox((prev) => !prev)}
                                        className="text-xs font-medium hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                                    >
                                        Reply
                                    </button>
                                )}

                                {/* Context Menu */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 transition-colors cursor-pointer outline-none">
                                        <MoreVertical className="w-3.5 h-3.5" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-44 text-xs">
                                        {canEdit && (
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    setIsEditing(true);
                                                    setEditText(comment.commentbody);
                                                }}
                                                className="flex items-center gap-2 cursor-pointer"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                                <span>Edit ({remainingMinutes}m left)</span>
                                            </DropdownMenuItem>
                                        )}

                                        {comment.isedited && (
                                            <DropdownMenuItem
                                                onClick={() => setIsHistoryOpen(true)}
                                                className="flex items-center gap-2 cursor-pointer"
                                            >
                                                <History className="w-3.5 h-3.5" />
                                                <span>View edit history</span>
                                            </DropdownMenuItem>
                                        )}

                                        {isOwner && (
                                            <DropdownMenuItem
                                                onClick={handleDelete}
                                                className="flex items-center gap-2 text-red-600 dark:text-red-400 cursor-pointer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                <span>Delete comment</span>
                                            </DropdownMenuItem>
                                        )}

                                        <DropdownMenuItem
                                            onClick={() => setIsReportOpen(true)}
                                            className="flex items-center gap-2 cursor-pointer"
                                        >
                                            <Flag className="w-3.5 h-3.5" />
                                            <span>Report</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )}
                    </div>
                )}

                {/* Inline Reply Input Box */}
                {showReplyBox && (
                    <div className="flex gap-3 mt-3 pt-2">
                        <Avatar className="w-7 h-7 shrink-0">
                            <AvatarImage src={user?.image || ""} />
                            <AvatarFallback className="text-[10px]">
                                {user?.name?.[0] || "U"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                            <Textarea
                                placeholder={`Reply to @${comment.usercommented}...`}
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                className="min-h-[60px] text-xs resize-none"
                                autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setShowReplyBox(false)}
                                    className="h-7 text-xs"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSubmitReply}
                                    disabled={!replyText.trim() || isSubmittingReply}
                                    className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {isSubmittingReply ? "Posting..." : "Reply"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Threaded Replies Toggle & Nested List */}
                {childReplies.length > 0 && (
                    <div className="pt-2">
                        <button
                            onClick={() => setShowReplies((prev) => !prev)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 px-2.5 py-1 rounded-full transition-colors"
                        >
                            {showReplies ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                            )}
                            <span>
                                {showReplies
                                    ? "Hide replies"
                                    : `${childReplies.length} ${childReplies.length === 1 ? "reply" : "replies"}`}
                            </span>
                        </button>

                        {showReplies && (
                            <div className="mt-3 pl-4 border-l-2 border-gray-100 dark:border-zinc-800 space-y-4">
                                {childReplies.map((reply) => (
                                    <CommentItem
                                        key={reply._id}
                                        comment={reply}
                                        allComments={allComments}
                                        onCommentUpdated={onCommentUpdated}
                                        onCommentDeleted={onCommentDeleted}
                                        onReplySubmitted={onReplySubmitted}
                                        targetLanguage={targetLanguage}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Dialogs */}
            <CommentReportDialog
                isOpen={isReportOpen}
                onClose={() => setIsReportOpen(false)}
                commentId={comment._id}
                commentAuthor={comment.usercommented}
                commentText={comment.commentbody}
            />

            <CommentHistoryDialog
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                commentId={comment._id}
                authorName={comment.usercommented}
            />
        </div>
    );
};

export default CommentItem;
