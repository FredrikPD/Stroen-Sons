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
        orderBy: { name: "asc" }
    });

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto pb-12">
            {/* Main Feed Column */}
            <div className="lg:col-span-2">
                <PostList isAdmin={isAdmin} categories={categories} />
            </div>

            {/* Sidebar Column */}
            <div>
                {/* Spacer to align with posts (below header/tabs) */}
                <div className="hidden lg:block h-[126px]"></div>

                <div className="space-y-6 sticky top-24 self-start">

                    {/* Festet Info Widget */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-4 text-indigo-600">
                            <span className="material-symbols-outlined text-lg">push_pin</span>
                            <h3 className="text-xs font-bold uppercase tracking-wider">Festet innlegg</h3>
                        </div>
                        {pinnedPosts.length > 0 ? (
                            <div className="flex flex-col divide-y divide-gray-100">
                                {pinnedPosts.map((post: any) => (
                                    <Link key={post.id} href={`/posts/${post.id}`} className="block group py-3 first:pt-0 last:pb-0">
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium mb-0.5 uppercase tracking-wider">
                                            <span>{post.author.firstName} {post.author.lastName}</span>
                                            <span>•</span>
                                            <span>{new Date(post.createdAt).toLocaleDateString("no-NO", { day: "numeric", month: "short" })}</span>
                                        </div>
                                        <div className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                            {post.title}
                                        </div>
                                    </Link>

                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-gray-500 italic">
                                Ingen festede innlegg.
                            </div>
                        )}
                    </div>

                    {/* Nylige Filer Widget */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-4 text-indigo-600">
                            <span className="material-symbols-outlined text-lg">folder</span>
                            <h3 className="text-xs font-bold uppercase tracking-wider">Nylige filer</h3>
                        </div>
                        {recentFiles.length > 0 ? (
                            <div className="space-y-3">
                                {recentFiles.map((file: any) => (
                                    <a key={file.id} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors group">
                                        <div className="flex-shrink-0 w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500">
                                            <span className="material-symbols-outlined text-lg">description</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{file.name}</p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {new Date(file.createdAt).toLocaleDateString("no-NO")}
                                                {file.post ? <span className="text-indigo-400"> • {file.post.title}</span> : null}
                                            </p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-gray-500 italic">
                                Ingen nylige filer.
                            </div>
                        )}
                    </div>

                    {/* Kommende Arrangementer Widget */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-indigo-600">
                                <span className="material-symbols-outlined text-lg">calendar_month</span>
                                <h3 className="text-xs font-bold uppercase tracking-wider">Kommende</h3>
                            </div>
                            <Link href="/events" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">Se alle</Link>
                        </div>
                        <div className="space-y-4">
                            {upcomingEvents.length > 0 ? (
                                upcomingEvents.map((event: any) => (
                                    <div key={event.id} className="flex gap-3 items-start group">
                                        <div className="flex-shrink-0 w-12 h-12 bg-indigo-50 rounded-lg flex flex-col items-center justify-center border border-indigo-100 group-hover:border-indigo-200 transition-colors">
                                            <span className="text-[10px] font-bold text-indigo-400 uppercase leading-none">
                                                {new Date(event.startAt).toLocaleDateString("no-NO", { month: "short" }).replace(".", "")}
                                            </span>
                                            <span className="text-lg font-bold text-indigo-700 leading-none mt-0.5">
                                                {new Date(event.startAt).getDate()}
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">
                                                {event.title}
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                Kl {new Date(event.startAt).toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" })} • {event._count.attendees} påmeldte
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-sm text-gray-500 italic">
                                    Ingen kommende arrangementer.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
