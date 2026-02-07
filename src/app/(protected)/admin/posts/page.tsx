"use server";

import Link from "next/link";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { getPosts } from "@/server/actions/posts";
import { DeletePostButton } from "./_components/DeletePostButton";
import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";

export default async function AdminPostsPage() {
    await ensureRole([Role.ADMIN, Role.MODERATOR]);
    const { items: posts } = await getPosts({ limit: 100 });

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-6">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Alle Innlegg</h1>
                        <p className="text-gray-500 text-sm">Administrer nyheter og oppdateringer</p>
                    </div>
                </div>
                <Link
                    href="/admin/posts/new"
                    className="bg-[#4F46E5] hover:bg-[#4338ca] text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 flex items-center gap-2 text-sm"
                >
                    <span className="material-symbols-outlined text-lg">add_circle</span>
                    Nytt Innlegg
                </Link>
            </div>

            {/* Content */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {posts.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <span className="material-symbols-outlined text-3xl">post_add</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Ingen innlegg</h3>
                        <p className="text-gray-500 text-sm mb-6">Det er ingen innlegg i systemet enda.</p>
                        <Link
                            href="/admin/posts/new"
                            className="inline-flex items-center gap-2 text-[#4F46E5] font-bold text-sm hover:underline"
                        >
                            Opprett det første innlegget
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Tittel</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Kategori</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Forfatter</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Dato</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700 text-right">Handlinger</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {posts.map((post) => (
                                    <tr key={post.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900 truncate max-w-[450px]">{post.title}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                {post.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {post.author.firstName} {post.author.lastName}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-medium">
                                            {format(post.createdAt, "d. MMM yyyy", { locale: nb })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link
                                                    href={`/admin/posts/${post.id}/edit`}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors"
                                                    title="Rediger"
                                                >
                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                </Link>
                                                <DeletePostButton id={post.id} title={post.title} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
