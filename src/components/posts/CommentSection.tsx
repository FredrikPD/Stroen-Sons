"use client";

import { useState, useEffect } from "react";

type Comment = {
    id: string;
    content: string;
    createdAt: string;
    parentId: string | null;
    author: {
        id: string;
        firstName: string | null;
        lastName: string | null;
    };
};

const CommentNode = ({
    comment,
    comments,
    replyInput,
    setReplyInput,
    replyOpen,
    setReplyOpen,
    onPostComment
}: {
    comment: Comment;
    comments: Comment[];
    replyInput: { [key: string]: string };
    setReplyInput: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
    replyOpen: { [key: string]: boolean };
    setReplyOpen: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>;
    onPostComment: (parentId: string) => void;
}) => {
    const getReplies = (parentId: string) => comments.filter((c) => c.parentId === parentId);
    const replies = getReplies(comment.id);
    const authorName = [comment.author.firstName, comment.author.lastName]
        .filter(Boolean)
        .join(" ") || "Unknown";

    const date = new Date(comment.createdAt).toLocaleDateString("no-NO", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
    });

    return (
        <div className="flex flex-col gap-0.5 relative">
            <div className="py-1">
                <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-gray-900">{authorName}</span>
                    <span className="text-[10px] text-gray-400">{date}</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-snug">{comment.content}</p>
                <button
                    onClick={() => setReplyOpen(prev => ({ ...prev, [comment.id]: !prev[comment.id] }))}
                    className="text-[10px] font-medium text-gray-500 hover:text-gray-900 transition-colors mt-0.5"
                >
                    Svar
                </button>
            </div>

            {/* Reply Input */}
            {replyOpen[comment.id] && (
                <div className="ml-4 sm:ml-8 mt-2 flex gap-2">
                    <input
                        type="text"
                        value={replyInput[comment.id] || ""}
                        onChange={(e) => setReplyInput(prev => ({ ...prev, [comment.id]: e.target.value }))}
                        placeholder="Skriv et svar..."
                        className="flex-1 bg-white text-gray-900 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-gray-300"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onPostComment(comment.id);
                        }}
                    />
                    <button
                        onClick={() => onPostComment(comment.id)}
                        className="px-3 py-1 bg-[#1A1A1A] text-white text-xs font-bold rounded-lg hover:bg-black transition-colors"
                    >
                        Send
                    </button>
                </div>
            )}

            {/* Replies */}
            {replies.length > 0 && (
                <div className="flex flex-col gap-3 ml-4 sm:ml-8 pl-4 border-l border-gray-200 mt-2">
                    {replies.map((reply) => (
                        <CommentNode
                            key={reply.id}
                            comment={reply}
                            comments={comments}
                            replyInput={replyInput}
                            setReplyInput={setReplyInput}
                            replyOpen={replyOpen}
                            setReplyOpen={setReplyOpen}
                            onPostComment={onPostComment}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default function CommentSection({ postId }: { postId: string }) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(false);
    const [replyInput, setReplyInput] = useState<{ [key: string]: string }>({}); // map commentId -> content
    const [newComment, setNewComment] = useState("");
    const [replyOpen, setReplyOpen] = useState<{ [key: string]: boolean }>({}); // map commentId -> boolean

    useEffect(() => {
        fetchComments();
    }, [postId]);

    const fetchComments = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/posts/${postId}/comments`);
            if (!res.ok) throw new Error("Failed to fetch comments");
            const data = await res.json();
            setComments(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handlePostComment = async (parentId: string | null = null) => {
        const content = parentId ? replyInput[parentId] : newComment;
        if (!content?.trim()) return;

        try {
            const res = await fetch(`/api/posts/${postId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content, parentId }),
            });

            if (!res.ok) throw new Error("Failed to post comment");

            const savedComment = await res.json();
            setComments((prev) => [...prev, savedComment]);

            if (parentId) {
                setReplyInput((prev) => ({ ...prev, [parentId]: "" }));
                setReplyOpen((prev) => ({ ...prev, [parentId]: false }));
            } else {
                setNewComment("");
            }
        } catch (error) {
            console.error(error);
        }
    };

    // Organize comments into a tree
    const rootComments = comments.filter((c) => c.parentId === null);

    return (
        <div className="flex flex-col gap-4">
            {/* New Comment Input */}
            <div className="flex gap-2">
                <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Skriv en kommentar..."
                    className="flex-1 min-h-[40px] max-h-[80px] bg-white text-gray-900 px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-gray-300 resize-y"
                />
                <button
                    onClick={() => handlePostComment(null)}
                    disabled={!newComment.trim()}
                    className="h-[40px] px-4 bg-[#1A1A1A] text-white text-xs font-bold rounded-lg hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
                >
                    Post
                </button>
            </div>

            {/* List */}
            <div className="flex flex-col gap-2">
                {loading && comments.length === 0 ? (
                    <div className="text-center text-gray-500 text-xs py-1">Laster kommentarer...</div>
                ) : (
                    rootComments.map((comment) => (
                        <CommentNode
                            key={comment.id}
                            comment={comment}
                            comments={comments}
                            replyInput={replyInput}
                            setReplyInput={setReplyInput}
                            replyOpen={replyOpen}
                            setReplyOpen={setReplyOpen}
                            onPostComment={handlePostComment}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
