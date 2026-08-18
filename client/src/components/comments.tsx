"use client";

import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";

interface CommentType {
  _id: string;
  videoid: string;
  userid: string;
  usercommented: string;
  commentbody: string;
  city?: string;
  likes?: number;
  dislikes?: number;
  deleted?: boolean;
  commentedon: string;
}

// Temporary stub until AuthContext is ready
const fakeUser = {
  _id: "demo123",
  name: "Demo User",
  image: "",
};


// Allow non-empty comment text
const COMMENT_ALLOWED_REGEX = /^\s*\S+/;

const fakeApi = {
  getComments: (videoId: string) =>
    new Promise<CommentType[]>((resolve) => {
      setTimeout(() => {
        resolve([
          {
            _id: "1",
            videoid: videoId,
            userid: "u1",
            usercommented: "Alice",
            commentbody: "Great video!",
            commentedon: new Date().toISOString(),
            likes: 2,
            dislikes: 0,
          },
          {
            _id: "2",
            videoid: videoId,
            userid: "u2",
            usercommented: "Bob",
            commentbody: "Can you cover more topics?",
            commentedon: new Date().toISOString(),
            likes: 1,
            dislikes: 0,
          },
        ]);
      }, 500);
    }),

  postComment: (comment: CommentType) =>
    new Promise<CommentType>((resolve) => {
      setTimeout(() => resolve(comment), 300);
    }),

  editComment: (id: string, body: string) =>
    new Promise<string>((resolve) => {
      setTimeout(() => resolve(body), 300);
    }),

  deleteComment: (_id: string) =>
    new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(true), 300);
    }),

  reactComment: (id: string, type: "like" | "dislike") =>
    new Promise<{ likes: number; dislikes: number }>((resolve) => {
      setTimeout(() => {
        resolve({
          likes: type === "like" ? Math.floor(Math.random() * 10) : 0,
          dislikes: type === "dislike" ? Math.floor(Math.random() * 5) : 0,
        });
      }, 300);
    }),
};

const Comments = ({ videoId }: { videoId: string }) => {
    const user = fakeUser;

  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // Load comments
  useEffect(() => {
    let isMounted = true;
    fakeApi.getComments(videoId).then((data) => {
      if (isMounted) {
        setComments(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [videoId]);

  // Create comment
  const handleSubmitComment = async () => {
    if (!user) return;
    const cleaned = newComment.trim();
    if (!cleaned || !COMMENT_ALLOWED_REGEX.test(cleaned)) return;

    setIsSubmitting(true);
    const newC: CommentType = {
      _id: Date.now().toString(),
      videoid: videoId,
      userid: user._id,
      usercommented: user.name,
      commentbody: cleaned,
      commentedon: new Date().toISOString(),
      likes: 0,
      dislikes: 0,
    };

    const saved = await fakeApi.postComment(newC);
    setComments((prev) => [saved, ...prev]);
    setNewComment("");
    setIsSubmitting(false);
  };

  // Edit comment
  const handleUpdateComment = async () => {
    if (!editingCommentId) return;
    const cleaned = editText.trim();
    if (!cleaned || !COMMENT_ALLOWED_REGEX.test(cleaned)) return;

    await fakeApi.editComment(editingCommentId, cleaned);
    setComments((prev) =>
      prev.map((c) =>
        c._id === editingCommentId ? { ...c, commentbody: cleaned } : c
      )
    );
    setEditingCommentId(null);
    setEditText("");
  };

  // Delete comment
  const handleDelete = async (id: string) => {
    const ok = await fakeApi.deleteComment(id);
    if (ok) setComments((prev) => prev.filter((c) => c._id !== id));
  };

  // Like/dislike
  const reactComment = async (id: string, type: "like" | "dislike") => {
    const res = await fakeApi.reactComment(id, type);
    setComments((prev) =>
      prev.map((c) =>
        c._id === id ? { ...c, likes: res.likes, dislikes: res.dislikes } : c
      )
    );
  };

  if (loading) return <div>Loading comments...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{comments.length} Comments</h2>

      {user && (
        <div className="flex gap-4">
          <Avatar className="w-10 h-10">
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => setNewComment("")}
                disabled={!newComment.trim()}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitComment}
                disabled={isSubmitting || !newComment.trim()}
              >
                Comment
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment._id} className="flex gap-4">
            <Avatar className="w-10 h-10">
              <AvatarFallback>{comment.usercommented?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{comment.usercommented}</span>
                <span className="text-xs text-gray-600">
                  {formatDistanceToNow(new Date(comment.commentedon))} ago
                </span>
              </div>

              {editingCommentId === comment._id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button onClick={handleUpdateComment}>Save</Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditingCommentId(null);
                        setEditText("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm">{comment.commentbody}</p>
                  <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    <button onClick={() => reactComment(comment._id, "like")}>
                      👍 {comment.likes || 0}
                    </button>
                    <button onClick={() => reactComment(comment._id, "dislike")}>
                      👎 {comment.dislikes || 0}
                    </button>
                    {user?._id === comment.userid && (
                      <>
                        <button onClick={() => {
                          setEditingCommentId(comment._id);
                          setEditText(comment.commentbody);
                        }}>Edit</button>
                        <button onClick={() => handleDelete(comment._id)}>Delete</button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Comments;
