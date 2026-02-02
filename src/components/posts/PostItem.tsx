"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Avatar } from "@/components/Avatar";

export type PostWithDetails = {
    id: string;
    title: string;
    content: string;
    category: "EVENT" | "NYHET" | "REFERAT" | "SOSIALT";
    createdAt: string;
    author: {
        firstName: string | null;
        lastName: string | null;
        email: string;
        role?: string;
    };
    event?: {
        id: string;
        title: string;
    } | null;
    _count: {
        comments: number;
    };
};

export default function PostItem({ post }: { post: PostWithDetails }) {
    // Fallback for name
    const authorName = [post.author.firstName, post.author.lastName]
        .filter(Boolean)
        .join(" ") || post.author.email;

    // function to calculate relative time
    const getRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return "Akkurat nå";
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} timer siden`;
        if (diffInSeconds < 86400) return "I går";
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} dager siden`;
        return date.toLocaleDateString("no-NO", { month: "long", day: "numeric" });
    };

    return (
        <article className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
            {/* Header Group: Author & Title */}
            <div className="flex flex-col gap-3 pb-2">
                {/* Author Row */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <Avatar
                            initials={post.author.firstName ? `${post.author.firstName[0]}${post.author.lastName ? post.author.lastName[0] : ""}` : "?"}
                            size="md"
                        />
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900">{authorName}</span>
                            <span className="text-xs text-gray-500">
                                Publisert {getRelativeTime(post.createdAt)}
                            </span>
                        </div>
                    </div>
                    {/* Optional: 3-dots menu placeholder */}
                    <button className="text-gray-400 hover:text-gray-600">
                        <span className="material-symbols-outlined text-lg">more_horiz</span>
                    </button>
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-gray-900 leading-tight">
                    {post.title}
                </h2>
            </div>

            {/* Divider (Invisible spacer or visible line, using Spacer for now) */}
            <div className="h-px w-full bg-gray-100" />

            {/* Content Body */}
            <div className="py-2">
                <div className="text-gray-600 text-sm leading-relaxed prose prose-sm prose-zinc max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-indigo-600 prose-li:text-gray-600">
                    <ReactMarkdown>{post.content}</ReactMarkdown>
                </div>
            </div>

            {/* Action Bar / Footer */}
            <div className="pt-4 mt-2 border-t border-gray-100 flex items-center gap-6">

                {/* Comment Button (Interactive) */}
                <Link
                    href={`/posts/${post.id}`}
                    className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors group"
                >
                    <span className="material-symbols-outlined text-xl group-hover:fill-current">chat_bubble</span>
                    <span className="text-sm font-medium">
                        {post._count.comments > 0 ? `${post._count.comments} Kommentarer` : "Kommenter"}
                    </span>
                </Link>

                {/* Share Button (Placeholder) */}
                <button className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors ml-auto">
                    <span className="material-symbols-outlined text-xl">share</span>
                </button>
            </div>
        </article>
    );
}
