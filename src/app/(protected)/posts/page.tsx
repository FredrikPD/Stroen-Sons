import { Metadata } from "next";
import PostList from "@/components/posts/PostList";

export const metadata: Metadata = {
    title: "Innlegg",
    description: "Nyheter og oppdateringer fra klubben.",
};

import { getPinnedPosts } from "@/server/actions/posts";
import { getUpcomingEvents } from "@/server/actions/events";
import { getRecentFiles } from "@/server/actions/files";
import { ensureMember } from "@/server/auth/ensureMember";
import Link from "next/link";
import { prisma } from "@/server/db";

export default async function PostsPage() {
    const pinnedPosts = await getPinnedPosts();
    const upcomingEvents = await getUpcomingEvents();
    const recentFiles = await getRecentFiles();
    const member = await ensureMember();
    const isAdmin = member?.role === "ADMIN";

    const categories = await prisma.category.findMany({
        orderBy: { name: "asc" },
    });

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto pb-12">

            {/* ── Main Feed ── */}
            <div className="lg:col-span-2">
                <PostList isAdmin={isAdmin} categories={categories} />
            </div>

            {/* ── Sidebar ── */}
            <div className="order-first lg:order-none">
                {/* Aligns sidebar top with post list below header + tabs */}
                <div className="hidden lg:block h-[126px]" />

                <div className="space-y-4 sticky top-24 self-start">

                    {/* Festet innlegg */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100">
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-700 shrink-0">
                                Festet innlegg
                            </span>
                            <div className="flex-1 h-px bg-gray-100" />
                        </div>
                        <div className="px-4 py-3">
                            {pinnedPosts.length > 0 ? (
                                <div className="flex flex-col gap-0.5">
                                    {pinnedPosts.map((post: any) => (
                                        <Link
                                            key={post.id}
                                            href={`/posts/${post.id}`}
                                            className="flex items-center justify-between py-2.5 px-1 -mx-1 rounded-lg hover:bg-gray-50 transition-colors group"
                                        >
                                            <div className="min-w-0">
                                                <p className="font-semibold text-[12px] text-gray-800 group-hover:text-gray-600 transition-colors line-clamp-1">
                                                    {post.title}
                                                </p>
                                                <p className="text-[9px] text-gray-400 font-medium mt-0.5">
                                                    {post.author.firstName} {post.author.lastName} &middot;{" "}
                                                    {new Date(post.createdAt).toLocaleDateString("nb-NO", {
                                                        day: "numeric",
                                                        month: "short",
                                                    })}
                                                </p>
                                            </div>
                                            <span className="material-symbols-outlined text-[16px] text-gray-300 group-hover:text-gray-500 transition-colors shrink-0 ml-2">
                                                chevron_right
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p
                                    className="text-xs text-gray-400 italic py-2"
                                    style={{ fontFamily: "'Georgia', serif" }}
                                >
                                    Ingen festede innlegg.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Nylige filer */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100">
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-700 shrink-0">
                                Nylige filer
                            </span>
                            <div className="flex-1 h-px bg-gray-100" />
                        </div>
                        <div className="px-4 py-3 space-y-0.5">
                            {recentFiles.length > 0 ? (
                                recentFiles.map((file: any) => (
                                    <a
                                        key={file.id}
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2.5 py-2.5 px-1 -mx-1 rounded-lg hover:bg-gray-50 transition-colors group"
                                    >
                                        <div className="w-7 h-7 bg-gray-50 border border-gray-100 rounded-md flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-[14px] text-gray-400">
                                                description
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[12px] font-semibold text-gray-800 group-hover:text-gray-600 transition-colors truncate">
                                                {file.name}
                                            </p>
                                            <p className="text-[9px] text-gray-400 font-medium mt-0.5 truncate">
                                                {new Date(file.createdAt).toLocaleDateString("nb-NO")}
                                                {file.post && <span> &middot; {file.post.title}</span>}
                                            </p>
                                        </div>
                                        <span className="material-symbols-outlined text-[14px] text-gray-300 group-hover:text-gray-500 transition-colors shrink-0 ml-auto">
                                            download
                                        </span>
                                    </a>
                                ))
                            ) : (
                                <p
                                    className="text-xs text-gray-400 italic py-2"
                                    style={{ fontFamily: "'Georgia', serif" }}
                                >
                                    Ingen nylige filer.
                                </p>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
