"use client";

import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import {
    ThumbsUp,
    ThumbsDown,
    MessageSquare,
    MessageSquareOff,
    Trash2,
    Send,
    Megaphone,
    Sparkles,
    CheckCircle2,
    Lock,
    Unlock,
    Loader2,
} from "lucide-react";
import axiosInstance from "@/lib/AxiosInstance";
import { useUser } from "@/lib/AuthContext";

interface PostComment {
    _id: string;
    userId: string;
    userName: string;
    userImage: string;
    text: string;
    createdAt: string;
}

interface CommunityPost {
    _id: string;
    channelId: string;
    authorId: string;
    authorName: string;
    authorImage: string;
    content: string;
    image?: string;
    tag?: string;
    likesCount: number;
    dislikesCount: number;
    commentsCount: number;
    isLiked: boolean;
    isDisliked: boolean;
    allowComments: boolean;
    comments: PostComment[];
    createdAt: string;
}

interface ChannelCommunityProps {
    channelId: string;
    channelName: string;
    isOwner: boolean;
}

export default function ChannelCommunity({
    channelId,
    channelName,
    isOwner,
}: ChannelCommunityProps) {
    const { user } = useUser();
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [loading, setLoading] = useState(true);

    // Composer state for owner
    const [newContent, setNewContent] = useState("");
    const [newTag, setNewTag] = useState("Announcement");
    const [allowCommentsOnNew, setAllowCommentsOnNew] = useState(true);
    const [isPosting, setIsPosting] = useState(false);

    // Active expanded comment sections: Set of postId
    const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
    // In-flight comment inputs per post: Map of postId -> string
    const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
    const [submittingCommentFor, setSubmittingCommentFor] = useState<string | null>(null);

    const fetchPosts = async () => {
        try {
            const query = user?._id ? `?userId=${user._id}` : "";
            const res = await axiosInstance.get(`/api/community/channel/${channelId}${query}`);
            if (res.data?.success && Array.isArray(res.data.posts)) {
                setPosts(res.data.posts);
            }
        } catch (error) {
            console.error("Error fetching community posts:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, [channelId, user?._id]);

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newContent.trim() || !user?._id) return;

        setIsPosting(true);
        try {
            const res = await axiosInstance.post("/api/community/create", {
                channelId,
                userId: user._id,
                content: newContent.trim(),
                tag: newTag,
                allowComments: allowCommentsOnNew,
            });

            if (res.data?.success && res.data.post) {
                setNewContent("");
                setPosts((prev) => [
                    {
                        ...res.data.post,
                        likesCount: 0,
                        dislikesCount: 0,
                        commentsCount: 0,
                        isLiked: false,
                        isDisliked: false,
                        comments: [],
                    },
                    ...prev,
                ]);
            }
        } catch (error) {
            console.error("Failed to post announcement:", error);
            alert("Failed to publish announcement. Please try again.");
        } finally {
            setIsPosting(false);
        }
    };

    const handleReaction = async (postId: string, reactionType: "like" | "dislike") => {
        if (!user?._id) {
            alert("Please sign in to react to announcements.");
            return;
        }

        try {
            const res = await axiosInstance.post(`/api/community/react/${postId}`, {
                userId: user._id,
                reactionType,
            });

            if (res.data?.success) {
                setPosts((prev) =>
                    prev.map((p) => {
                        if (p._id !== postId) return p;
                        return {
                            ...p,
                            likesCount: res.data.likesCount,
                            dislikesCount: res.data.dislikesCount,
                            isLiked: res.data.isLiked,
                            isDisliked: res.data.isDisliked,
                        };
                    })
                );
            }
        } catch (error) {
            console.error("Error updating reaction:", error);
        }
    };

    const handleToggleAllowComments = async (postId: string, currentState: boolean) => {
        if (!user?._id || !isOwner) return;

        try {
            const res = await axiosInstance.post(`/api/community/toggle-comments/${postId}`, {
                userId: user._id,
                allowComments: !currentState,
            });

            if (res.data?.success) {
                setPosts((prev) =>
                    prev.map((p) => {
                        if (p._id !== postId) return p;
                        return {
                            ...p,
                            allowComments: res.data.allowComments,
                        };
                    })
                );
            }
        } catch (error) {
            console.error("Error toggling comments block:", error);
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!user?._id || !isOwner) return;
        if (!confirm("Are you sure you want to delete this announcement?")) return;

        try {
            const res = await axiosInstance.delete(`/api/community/${postId}`, {
                data: { userId: user._id },
            });

            if (res.data?.success) {
                setPosts((prev) => prev.filter((p) => p._id !== postId));
            }
        } catch (error) {
            console.error("Failed to delete post:", error);
        }
    };

    const toggleCommentSection = (postId: string) => {
        setExpandedComments((prev) => {
            const next = new Set(prev);
            if (next.has(postId)) {
                next.delete(postId);
            } else {
                next.add(postId);
            }
            return next;
        });
    };

    const handleAddComment = async (postId: string) => {
        const text = commentInputs[postId]?.trim();
        if (!text || !user?._id) return;

        setSubmittingCommentFor(postId);
        try {
            const res = await axiosInstance.post(`/api/community/comment/${postId}`, {
                userId: user._id,
                userName: user.channelname || user.name || "Viewer",
                userImage: user.image || "",
                text,
            });

            if (res.data?.success && res.data.comment) {
                setPosts((prev) =>
                    prev.map((p) => {
                        if (p._id !== postId) return p;
                        return {
                            ...p,
                            comments: [...p.comments, res.data.comment],
                            commentsCount: (p.commentsCount || 0) + 1,
                        };
                    })
                );
                setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
            }
        } catch (error: any) {
            console.error("Failed to add comment:", error);
            const msg = error.response?.data?.message || "Failed to post comment.";
            alert(msg);
        } finally {
            setSubmittingCommentFor(null);
        }
    };

    const handleDeleteComment = async (postId: string, commentId: string) => {
        if (!user?._id) return;

        try {
            const res = await axiosInstance.delete(`/api/community/comment/${postId}/${commentId}`, {
                data: { userId: user._id },
            });

            if (res.data?.success) {
                setPosts((prev) =>
                    prev.map((p) => {
                        if (p._id !== postId) return p;
                        return {
                            ...p,
                            comments: p.comments.filter((c) => c._id !== commentId),
                            commentsCount: Math.max(0, (p.commentsCount || 1) - 1),
                        };
                    })
                );
            }
        } catch (error) {
            console.error("Failed to delete comment:", error);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Creator Announcement Composer for Channel Owner */}
            {isOwner && (
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                        <Megaphone className="w-4 h-4" />
                        <span>Post Channel Announcement</span>
                    </div>

                    <form onSubmit={handleCreatePost} className="space-y-3.5">
                        <Textarea
                            placeholder={`Share an update, announcement, or question with your viewers...`}
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                            rows={3}
                            className="text-sm bg-gray-50 dark:bg-zinc-800/60 border-gray-200 dark:border-zinc-700 rounded-2xl focus-visible:ring-indigo-500 resize-none"
                        />

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                            <div className="flex items-center gap-3">
                                {/* Tag Selector */}
                                <select
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    className="text-xs bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-lg px-2.5 py-1.5 border border-gray-200 dark:border-zinc-700 font-medium"
                                >
                                    <option value="Announcement">Announcement</option>
                                    <option value="Update">Channel Update</option>
                                    <option value="Special">Special News</option>
                                    <option value="Behind the Scenes">Behind the Scenes</option>
                                </select>

                                {/* Block/Allow comments toggle */}
                                <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={allowCommentsOnNew}
                                        onChange={(e) => setAllowCommentsOnNew(e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span>Allow viewer comments</span>
                                </label>
                            </div>

                            <Button
                                type="submit"
                                disabled={isPosting || !newContent.trim()}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl px-5 py-2 shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                                {isPosting ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Publishing...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-3.5 h-3.5" />
                                        <span>Publish Post</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Announcements Feed */}
            {loading ? (
                <div className="py-16 text-center text-sm text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Loading announcements...</span>
                </div>
            ) : posts.length === 0 ? (
                <div className="text-center py-20 px-4 rounded-3xl bg-gray-50/50 dark:bg-zinc-900/40 border border-gray-200/80 dark:border-zinc-800/80 shadow-xs">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-3">
                        <Megaphone className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
                        No announcements yet
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                        {isOwner
                            ? "Post your first channel announcement to connect directly with your audience."
                            : "This creator has not published any community announcements yet."}
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {posts.map((post) => {
                        const isCommentsOpen = expandedComments.has(post._id);
                        const initial = (post.authorName?.[0] || "C").toUpperCase();
                        const formattedDate = new Date(post.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                        });

                        return (
                            <div
                                key={post._id}
                                className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 transition-all"
                            >
                                {/* Author & Header */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-10 h-10 border border-gray-200 dark:border-zinc-700">
                                            <AvatarImage src={post.authorImage} alt={post.authorName} />
                                            <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold text-sm">
                                                {initial}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                                                    {post.authorName}
                                                </span>
                                                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 fill-indigo-100 dark:fill-indigo-950" />
                                                {post.tag && (
                                                    <span className="ml-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
                                                        {post.tag}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                                {formattedDate}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Channel Owner Actions */}
                                    {isOwner && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() =>
                                                    handleToggleAllowComments(post._id, post.allowComments)
                                                }
                                                className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                                                    post.allowComments
                                                        ? "text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
                                                        : "text-amber-600 bg-amber-50 dark:bg-amber-950/40"
                                                }`}
                                                title={
                                                    post.allowComments
                                                        ? "Click to block viewer comments on this announcement"
                                                        : "Click to enable comments"
                                                }
                                            >
                                                {post.allowComments ? (
                                                    <Unlock className="w-3.5 h-3.5" />
                                                ) : (
                                                    <Lock className="w-3.5 h-3.5" />
                                                )}
                                                <span className="text-[10px] hidden sm:inline">
                                                    {post.allowComments ? "Comments Open" : "Comments Blocked"}
                                                </span>
                                            </button>

                                            <button
                                                onClick={() => handleDeletePost(post._id)}
                                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                                                title="Delete announcement"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Announcement Content */}
                                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                                    {post.content}
                                </p>

                                {/* Action & Reaction Bar */}
                                <div className="flex items-center gap-4 pt-2 border-t border-gray-100 dark:border-zinc-800/60">
                                    {/* Like Button */}
                                    <button
                                        onClick={() => handleReaction(post._id, "like")}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                                            post.isLiked
                                                ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                                        }`}
                                    >
                                        <ThumbsUp
                                            className={`w-4 h-4 ${post.isLiked ? "fill-current" : ""}`}
                                        />
                                        <span>{post.likesCount}</span>
                                    </button>

                                    {/* Dislike Button */}
                                    <button
                                        onClick={() => handleReaction(post._id, "dislike")}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                                            post.isDisliked
                                                ? "bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400"
                                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                                        }`}
                                    >
                                        <ThumbsDown
                                            className={`w-4 h-4 ${post.isDisliked ? "fill-current" : ""}`}
                                        />
                                        <span>{post.dislikesCount}</span>
                                    </button>

                                    {/* Comments Trigger */}
                                    <button
                                        onClick={() => toggleCommentSection(post._id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                    >
                                        {post.allowComments ? (
                                            <MessageSquare className="w-4 h-4" />
                                        ) : (
                                            <MessageSquareOff className="w-4 h-4 text-amber-500" />
                                        )}
                                        <span>{post.commentsCount || post.comments?.length || 0}</span>
                                    </button>

                                    {!post.allowComments && (
                                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                                            <Lock className="w-3 h-3" />
                                            <span>Comments disabled</span>
                                        </span>
                                    )}
                                </div>

                                {/* Collapsible Comment Thread */}
                                {isCommentsOpen && (
                                    <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 space-y-4">
                                        {/* Notice if comments are blocked */}
                                        {!post.allowComments ? (
                                            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/50 text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-2">
                                                <Lock className="w-4 h-4 shrink-0" />
                                                <span>The channel creator has disabled comments for this announcement.</span>
                                            </div>
                                        ) : (
                                            /* Comment Input Composer */
                                            <div className="flex gap-2.5 items-center">
                                                <Avatar className="w-7 h-7 shrink-0">
                                                    <AvatarImage src={user?.image} />
                                                    <AvatarFallback className="text-xs">
                                                        {user?.name?.[0] || "U"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 flex gap-2">
                                                    <Input
                                                        type="text"
                                                        placeholder={user ? "Add a comment..." : "Sign in to add a comment"}
                                                        disabled={!user}
                                                        value={commentInputs[post._id] || ""}
                                                        onChange={(e) =>
                                                            setCommentInputs((prev) => ({
                                                                ...prev,
                                                                [post._id]: e.target.value,
                                                            }))
                                                        }
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                handleAddComment(post._id);
                                                            }
                                                        }}
                                                        className="h-8 text-xs bg-gray-50 dark:bg-zinc-800 rounded-xl"
                                                    />
                                                    <Button
                                                        size="sm"
                                                        disabled={
                                                            !user ||
                                                            !commentInputs[post._id]?.trim() ||
                                                            submittingCommentFor === post._id
                                                        }
                                                        onClick={() => handleAddComment(post._id)}
                                                        className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer"
                                                    >
                                                        {submittingCommentFor === post._id ? (
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                        ) : (
                                                            <span>Post</span>
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Comments List */}
                                        {post.comments && post.comments.length > 0 && (
                                            <div className="space-y-3 pt-2">
                                                {post.comments.map((comment) => {
                                                    const isCommentAuthor =
                                                        user?._id && comment.userId === user._id;
                                                    return (
                                                        <div
                                                            key={comment._id}
                                                            className="flex items-start justify-between gap-2.5 group"
                                                        >
                                                            <div className="flex items-start gap-2.5">
                                                                <Avatar className="w-6 h-6 shrink-0 mt-0.5">
                                                                    <AvatarImage src={comment.userImage} />
                                                                    <AvatarFallback className="text-[10px]">
                                                                        {comment.userName?.[0] || "V"}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="space-y-0.5">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                                                                            {comment.userName}
                                                                        </span>
                                                                        <span className="text-[10px] text-gray-400">
                                                                            {new Date(comment.createdAt).toLocaleDateString()}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-gray-700 dark:text-gray-300">
                                                                        {comment.text}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {(isCommentAuthor || isOwner) && (
                                                                <button
                                                                    onClick={() =>
                                                                        handleDeleteComment(post._id, comment._id)
                                                                    }
                                                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1 cursor-pointer"
                                                                    title="Delete comment"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
