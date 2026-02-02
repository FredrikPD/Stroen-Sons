"use server";

import Link from "next/link";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { getPosts } from "@/server/actions/posts";
import { DeleteEventButton } from "../events/_components/DeleteEventButton";

// Need a dedicated delete button or reuse one. 
// Ideally I should rename DeleteEventButton to generic DeleteButton or make a new DeletePostButton.
// For now I'll create a local one or update the existing if verified.
// Actually lets create a specific DeletePostButton.

import { DeletePostButton } from "./_components/DeletePostButton";

export default async function AdminPostsPage() {
    const { items: posts } = await getPosts({ limit: 100 }); // Function supports limit

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Innlegg</h1>
                    <p className="text-gray-500 text-sm">Administrer nyheter og innlegg på tavlen.</p>
                </div>
                <Link
                    href="/admin/posts/new"
                    className="inline-flex items-center justify-center gap-2 bg-[#1A56DB] hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
                >
                    <span className="material-symbols-outlined text-xl">add</span>
                    Nytt Innlegg
                </Link>
            </div>

            {/* Posts List */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                <th className="px-6 py-4">Tittel</th>
                                <th className="px-6 py-4">Kategori</th>
                                <th className="px-6 py-4">Forfatter</th>
                                <th className="px-6 py-4">Dato</th>
                                <th className="px-6 py-4 text-right">Handlinger</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {posts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        Ingen innlegg funnet.
                                    </td>
                                </tr>
                            ) : (
                                posts.map((post) => (
                                    <tr key={post.id} className="group hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-gray-900 block truncate max-w-[250px]">{post.title}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                {post.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {post.author.firstName} {post.author.lastName}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {format(post.createdAt, "d. MMM yyyy", { locale: nb })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link
                                                    href={`/admin/posts/${post.id}/edit`}
                                                    className="p-2 text-gray-400 hover:text-[#1A56DB] hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Rediger"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                                </Link>
                                                <DeletePostButton id={post.id} title={post.title} />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
