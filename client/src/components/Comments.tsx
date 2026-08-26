import React, { useEffect, useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import {
    ArrowUpDown,
    Globe,
    MapPin,
    Shield,
    AlertCircle,
    AtSign,
    Sparkles,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/AxiosInstance";
import CommentItem, { CommentData } from "./CommentItem";
import CommentCaptchaDialog from "./CommentCaptchaDialog";
import AdminModerationDialog from "./AdminModerationDialog";
import axios from "axios";

interface CommentsProps {
    videoId: string;
    videoOwnerId?: string;
    videoChannelName?: string;
}

const LANGUAGES = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish (Español)" },
    { code: "hi", name: "Hindi (हिन्दी)" },
    { code: "fr", name: "French (Français)" },
    { code: "de", name: "German (Deutsch)" },
    { code: "ja", name: "Japanese (日本語)" },
    { code: "zh", name: "Chinese (中文)" },
    { code: "ar", name: "Arabic (العربية)" },
    { code: "pt", name: "Portuguese (Português)" },
    { code: "ru", name: "Russian (Русский)" },
    { code: "ko", name: "Korean (한국어)" },
    { code: "it", name: "Italian (Italiano)" },
];

const Comments = ({ videoId, videoOwnerId, videoChannelName }: CommentsProps) => {
    const { user } = useUser();

    // Check if the current logged-in user is the channel owner of this video
    const isChannelOwner = Boolean(
        user && (
            (videoOwnerId && (user._id === videoOwnerId || user.email === videoOwnerId)) ||
            (videoChannelName && user.channelname && user.channelname.trim().toLowerCase() === videoChannelName.trim().toLowerCase()) ||
            (videoChannelName && user.name && user.name.trim().toLowerCase() === videoChannelName.trim().toLowerCase())
        )
    );

    const [comments, setComments] = useState<CommentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<"newest" | "most_liked" | "oldest" | "most_relevant">("newest");
    const [targetLanguage, setTargetLanguage] = useState("en");

    // Comment input state
    const [newComment, setNewComment] = useState("");
    const [userLocation] = useState<string>(() => {
        try {
            const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
            if (timeZone) {
                const parts = timeZone.split("/");
                return parts[1]?.replace(/_/g, " ") || parts[0] || "";
            }
        } catch {
            return "";
        }
        return "";
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Auto-complete @mentions state
    const [mentionSuggestions, setMentionSuggestions] = useState<string[]>([]);
    const [showMentionMenu, setShowMentionMenu] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // CAPTCHA challenge state
    const [captchaChallenge, setCaptchaChallenge] = useState<{ token: string; question: string } | null>(null);
    const [isCaptchaOpen, setIsCaptchaOpen] = useState(false);

    // Admin moderation modal state
    const [isAdminOpen, setIsAdminOpen] = useState(false);

    // Load comments from backend
    useEffect(() => {
        let ignore = false;
        if (videoId) {
            axiosInstance.get(`/api/comment/${videoId}?sort=${sortBy}`)
                .then((res) => {
                    if (!ignore && Array.isArray(res.data)) {
                        setComments(res.data);
                    }
                })
                .catch((error) => {
                    console.error("Failed to load comments:", error);
                })
                .finally(() => {
                    if (!ignore) setLoading(false);
                });
        }
        return () => {
            ignore = true;
        };
    }, [videoId, sortBy]);

    const reloadComments = () => {
        if (!videoId) return;
        setLoading(true);
        axiosInstance.get(`/api/comment/${videoId}?sort=${sortBy}`)
            .then((res) => {
                if (Array.isArray(res.data)) {
                    setComments(res.data);
                }
            })
            .catch((error) => {
                console.error("Failed to reload comments:", error);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    // Handle @mentions suggestion list
    const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setNewComment(val);
        setErrorMessage(null);

        // Check if user is typing an @mention
        const match = val.match(/@(\w*)$/);
        if (match) {
            const query = match[1].toLowerCase();
            // Collect unique authors from current comments
            const authors = Array.from(
                new Set(comments.map((c) => c.usercommented).filter(Boolean))
            );
            const filtered = authors.filter((a) => a.toLowerCase().includes(query)).slice(0, 5);
            setMentionSuggestions(filtered);
            setShowMentionMenu(filtered.length > 0);
        } else {
            setShowMentionMenu(false);
        }
    };

    const insertMention = (username: string) => {
        const val = newComment.replace(/@\w*$/, `@${username} `);
        setNewComment(val);
        setShowMentionMenu(false);
        textareaRef.current?.focus();
    };

    // Submit comment handler
    const handleSubmitComment = async (captchaToken?: string, captchaAnswer?: string) => {
        if (!user || !newComment.trim()) return;

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const res = await axiosInstance.post("/api/comment/postcomment", {
                videoid: videoId,
                userid: user._id,
                commentbody: newComment.trim(),
                usercommented: user.name || "Anonymous",
                userimage: user.image || "",
                userlocation: userLocation,
                parentcommentid: null,
                captchaToken,
                captchaAnswer,
            });

            if (res.data?.comment && res.data.result) {
                setComments([res.data.result, ...comments]);
                setNewComment("");
                setIsCaptchaOpen(false);
                setCaptchaChallenge(null);
            }
        } catch (err: unknown) {
            console.error("Error posting comment:", err);
            // Check if server demands CAPTCHA (due to flooding / rate-limit)
            if (axios.isAxiosError(err) && err.response?.status === 429 && err.response?.data?.requiresCaptcha) {
                setCaptchaChallenge(err.response.data.captcha);
                setIsCaptchaOpen(true);
            } else {
                let msg = "Failed to post comment. Please try again.";
                if (axios.isAxiosError(err) && err.response?.data?.message) {
                    msg = err.response.data.message;
                }
                setErrorMessage(msg);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // CAPTCHA solved callback
    const handleCaptchaVerified = (token: string, answer: string) => {
        handleSubmitComment(token, answer);
    };

    // Update single comment in state
    const handleCommentUpdated = (updated: CommentData) => {
        setComments((prev) => prev.map((c) => (c._id === updated._id ? { ...c, ...updated } : c)));
    };

    // Delete or soft-delete comment in state
    const handleCommentDeleted = (commentId: string, softDeleted?: boolean) => {
        if (softDeleted) {
            setComments((prev) =>
                prev.map((c) =>
                    c._id === commentId
                        ? {
                              ...c,
                              isdeleted: true,
                              commentbody: "[This comment has been deleted by the author]",
                              isedited: false,
                          }
                        : c
                )
            );
        } else {
            setComments((prev) => prev.filter((c) => c._id !== commentId));
        }
    };

    // Append newly posted reply
    const handleReplySubmitted = (newReply: CommentData) => {
        setComments((prev) => [
            ...prev.map((c) =>
                c._id === newReply.parentcommentid
                    ? { ...c, replycount: (c.replycount || 0) + 1 }
                    : c
            ),
            newReply,
        ]);
    };

    // Filter top-level comments (those without parentcommentid)
    const topLevelComments = comments.filter((c) => !c.parentcommentid);

    const sortLabels: Record<string, string> = {
        newest: "Newest first",
        most_liked: "Top comments",
        oldest: "Oldest first",
        most_relevant: "Most relevant",
    };

    return (
        <div className="space-y-6 pt-4 text-gray-900 dark:text-gray-100 font-sans">
            {/* Header: Total Count, Sort, Translation Target & Admin Hub */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-4">
                    <h3 className="text-xl font-bold tracking-tight">
                        {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
                    </h3>

                    {/* Sort Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 gap-1.5 px-3 rounded-md text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer outline-none">
                            <ArrowUpDown className="w-3.5 h-3.5" />
                            <span>Sort by: {sortLabels[sortBy]}</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-40 text-xs">
                            <DropdownMenuItem
                                onClick={() => setSortBy("newest")}
                                className={sortBy === "newest" ? "font-bold text-blue-600 dark:text-blue-400" : ""}
                            >
                                Newest first
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setSortBy("most_liked")}
                                className={sortBy === "most_liked" ? "font-bold text-blue-600 dark:text-blue-400" : ""}
                            >
                                Top comments
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setSortBy("most_relevant")}
                                className={sortBy === "most_relevant" ? "font-bold text-blue-600 dark:text-blue-400" : ""}
                            >
                                Most relevant
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setSortBy("oldest")}
                                className={sortBy === "oldest" ? "font-bold text-blue-600 dark:text-blue-400" : ""}
                            >
                                Oldest first
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="flex items-center gap-2">
                    {/* Translate Preferred Language Selector */}
                    <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 gap-1.5 px-3 rounded-md text-xs font-medium border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer outline-none">
                            <Globe className="w-3.5 h-3.5 text-blue-500" />
                            <span>Translate to: <span className="font-semibold">{targetLanguage.toUpperCase()}</span></span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 max-h-56 overflow-y-auto text-xs">
                            {LANGUAGES.map((l) => (
                                <DropdownMenuItem
                                    key={l.code}
                                    onClick={() => setTargetLanguage(l.code)}
                                    className={targetLanguage === l.code ? "font-bold text-blue-600 dark:text-blue-400" : ""}
                                >
                                    {l.name}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Channel Owner Moderation Button (Only visible to video owner) */}
                    {isChannelOwner && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsAdminOpen(true)}
                            className="h-8 px-2 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 font-medium"
                            title="Open Channel Moderation Hub"
                        >
                            <Shield className="w-3.5 h-3.5 mr-1" />
                            <span>Moderation</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Comment Input Box */}
            {user ? (
                <div className="flex gap-3">
                    <Avatar className="w-10 h-10 shrink-0 ring-1 ring-black/5">
                        <AvatarImage src={user.image || ""} />
                        <AvatarFallback className="bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-sm">
                            {user.name?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-2 relative">
                        <div className="relative">
                            <Textarea
                                ref={textareaRef}
                                placeholder="Add a comment... (Type @ to mention creators)"
                                value={newComment}
                                onChange={handleCommentChange}
                                maxLength={500}
                                className="min-h-[85px] resize-none border border-gray-200 dark:border-zinc-800 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500 text-sm p-3"
                            />

                            {/* Mentions Auto-Complete Dropdown */}
                            {showMentionMenu && mentionSuggestions.length > 0 && (
                                <div className="absolute left-3 top-full mt-1 z-30 w-52 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-gray-200 dark:border-zinc-800 overflow-hidden py-1">
                                    <div className="px-2.5 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                        <AtSign className="w-3 h-3" />
                                        <span>Mention User</span>
                                    </div>
                                    {mentionSuggestions.map((author) => (
                                        <button
                                            key={author}
                                            type="button"
                                            onClick={() => insertMention(author)}
                                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 dark:hover:bg-zinc-800 font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1.5"
                                        >
                                            <span className="text-blue-600 dark:text-blue-400 font-semibold">@{author}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Location Tag & Character Counter */}
                        <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <MapPin className="w-3.5 h-3.5" />
                                <span>Posting from {userLocation || "Global"}</span>
                            </div>
                            <span>{newComment.length}/500</span>
                        </div>

                        {/* Validation / Moderation Error Banner */}
                        {errorMessage && (
                            <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        <div className="flex gap-2 justify-end pt-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setNewComment("");
                                    setErrorMessage(null);
                                }}
                                disabled={!newComment.trim() || isSubmitting}
                                className="text-xs h-8"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => handleSubmitComment()}
                                disabled={!newComment.trim() || isSubmitting}
                                className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4"
                            >
                                {isSubmitting ? "Posting..." : "Comment"}
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 text-center space-y-1">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Join the conversation
                    </p>
                    <p className="text-xs text-gray-500">
                        Sign in to post comments, reply, react, and translate in real-time.
                    </p>
                </div>
            )}

            {/* Comments List */}
            {loading ? (
                <div className="space-y-4 pt-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-3 animate-pulse">
                            <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-zinc-800 shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3.5 bg-gray-200 dark:bg-zinc-800 rounded w-1/4" />
                                <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-3/4" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : topLevelComments.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                    <Sparkles className="w-8 h-8 mx-auto text-gray-400" />
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        No comments yet.
                    </p>
                    <p className="text-xs text-gray-500">
                        Be the first to share your thoughts in any language!
                    </p>
                </div>
            ) : (
                <div className="space-y-5 pt-2">
                    {topLevelComments.map((comment) => (
                        <CommentItem
                            key={comment._id}
                            comment={comment}
                            allComments={comments}
                            onCommentUpdated={handleCommentUpdated}
                            onCommentDeleted={handleCommentDeleted}
                            onReplySubmitted={handleReplySubmitted}
                            targetLanguage={targetLanguage}
                        />
                    ))}
                </div>
            )}

            {/* Anti-Spam CAPTCHA Challenge Modal */}
            <CommentCaptchaDialog
                isOpen={isCaptchaOpen}
                onClose={() => setIsCaptchaOpen(false)}
                initialCaptcha={captchaChallenge}
                onVerified={handleCaptchaVerified}
            />

            {/* Channel Moderation Dialog */}
            <AdminModerationDialog
                isOpen={isAdminOpen}
                onClose={() => setIsAdminOpen(false)}
                videoId={videoId}
                onCommentModerated={reloadComments}
            />
        </div>
    );
};

export default Comments;