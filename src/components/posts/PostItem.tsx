"use client";

import Link from "next/link";

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

    const date = new Date(post.createdAt).toLocaleDateString("no-NO", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });

    const getCategoryStyle = (category: string) => {
        switch (category) {
            case "EVENT":
                return "bg-red-50 text-red-600 border-red-100";
            case "REFERAT":
                return "bg-amber-50 text-amber-700 border-amber-100";
            case "SOSIALT":
                return "bg-emerald-50 text-emerald-700 border-emerald-100";
            case "NYHET":
            default:
                return "bg-blue-50 text-blue-600 border-blue-100";
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case "EVENT":
                return "calendar_month";
            case "REFERAT":
                return "description";
            case "SOSIALT":
                return "groups";
            case "NYHET":
            default:
                return "article";
        }
    };

    return (
        <article className="bg-white rounded-xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-md transition-shadow">
            <Link href={`/posts/${post.id}`} className="block p-6">
                <div className="flex justify-between items-center gap-4">
                    {/* Left Side: Metadata & Title */}
                    <div className="flex flex-col gap-2">
                        {/* Metadata Row */}
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#222] to-[#444] flex items-center justify-center text-white text-[9px] font-bold shadow-sm">
                                {authorName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                                <span className="font-bold text-gray-900">{authorName}</span>
                                <span className="text-gray-300">•</span>
                                <span>{date}</span>
                                <span className={`ml-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getCategoryStyle(post.category)} flex items-center gap-1`}>
                                    <span className="material-symbols-outlined text-[10px] leading-none">{getCategoryIcon(post.category)}</span>
                                    {post.category}
                                </span>
                            </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">{post.title}</h2>
                    </div>

                    {/* Right Side: Stats (Comments only as we lack Likes) */}
                    <div className="flex items-center gap-4 pl-4 border-l border-gray-100 h-full min-h-[40px]">
                        {/* Placeholder for Likes (Static/Hidden since no backend support) */}
                        {/* 
                         <div className="flex items-center gap-1.5 text-gray-400">
                            <span className="material-symbols-outlined text-[1.1rem]">thumb_up</span>
                            <span className="text-xs font-semibold">0</span>
                         </div>
                         */}

                        <div className="flex items-center gap-1.5 text-gray-400">
                            <span className="material-symbols-outlined text-[1.1rem]">chat_bubble</span>
                            <span className="text-xs font-semibold">{post._count.comments}</span>
                        </div>
                    </div>
                </div>
            </Link>
        </article>
    );
}
