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
        month: "long",
        year: "numeric",
    });

    const getCategoryStyle = (category: string) => {
        switch (category) {
            case "EVENT":
                return "bg-purple-50 text-purple-700 border-purple-100";
            case "REFERAT":
                return "bg-amber-50 text-amber-700 border-amber-100";
            case "SOSIALT":
                return "bg-emerald-50 text-emerald-700 border-emerald-100";
            case "NYHET":
            default:
                return "bg-indigo-50 text-indigo-700 border-indigo-100";
        }
    };

    const getCategoryLabel = (category: string) => {
        switch (category) {
            case "EVENT": return "Arrangement";
            case "REFERAT": return "Referat";
            case "SOSIALT": return "Sosialt";
            case "NYHET": return "Nyhet";
            default: return category;
        }
    };

    // Strip markdown or html from content for preview (simple approach)
    const previewText = post.content.replace(/[#*`]/g, '');

    return (
        <article className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-indigo-100 transition-all duration-300 relative overflow-hidden">
            {/* Hover Accent Line */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <Link href={`/posts/${post.id}`} className="block p-5 sm:p-6">
                <div className="flex flex-col gap-3">
                    {/* Header: Category & Date */}
                    <div className="flex items-center justify-between">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getCategoryStyle(post.category)}`}>
                            {getCategoryLabel(post.category)}
                        </span>
                        <span className="text-xs font-medium text-gray-400 font-mono">
                            {date}
                        </span>
                    </div>

                    {/* Body: Title & Excerpt */}
                    <div className="space-y-2">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors">
                            {post.title}
                        </h2>
                        <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">
                            {previewText}
                        </p>
                    </div>

                    {/* Footer: Author & Stats */}
                    <div className="pt-3 mt-1 border-t border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-800 to-black text-white flex items-center justify-center text-[9px] font-bold ring-2 ring-white shadow-sm">
                                {authorName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-900">{authorName}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-gray-400">
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                <span className="material-symbols-outlined text-[1rem]">chat_bubble_outline</span>
                                <span className="text-[10px] font-bold">{post._count.comments}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Link>
        </article>
    );
}
