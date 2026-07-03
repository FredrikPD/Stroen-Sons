

import Link from "next/link";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { getPosts } from "@/server/actions/posts";
import { DeletePostButton } from "./_components/DeletePostButton";
import { SetHeader } from "@/components/layout/SetHeader";
import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import { AdminPageHeader, AdminEmptyState, btnPrimary, card, SERIF } from "@/components/admin/ui";

export const metadata = {
    title: "Administrer Innlegg",
};

export default async function AdminPostsPage() {
    await ensureRole([Role.ADMIN, Role.MODERATOR]);
    const { items: posts } = await getPosts({ limit: 100 });

    return (
        <div className="space-y-8 pb-12">
            <SetHeader backHref="/admin/dashboard" backLabel="Dashboard" />
            {/* Header */}
            <AdminPageHeader
                eyebrow="Innhold"
                title="Alle Innlegg"
                description="Administrer nyheter og oppdateringer"
                actions={
                    <Link href="/admin/posts/new" className={btnPrimary}>
                        <span className="material-symbols-outlined text-lg">add_circle</span>
                        Nytt Innlegg
                    </Link>
                }
            />

            {/* Content */}
            {posts.length === 0 ? (
                <AdminEmptyState icon="post_add">
                    Ingen innlegg i systemet enda.{" "}
                    <Link href="/admin/posts/new" className="text-primary hover:text-primary-hover not-italic font-semibold">
                        Opprett det første innlegget
                    </Link>
                </AdminEmptyState>
            ) : (
                <div className={`${card} overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#faf8f3] border-b border-border-color">
                                <tr>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-400">Tittel</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-400">Kategori</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-400">Forfatter</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-400">Dato</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-400 text-right">Handlinger</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-color">
                                {posts.map((post) => (
                                    <tr key={post.id} className="hover:bg-black/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900 truncate max-w-[450px]" style={{ fontFamily: SERIF }}>{post.title}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cream text-text-secondary">
                                                {post.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-text-secondary">
                                            {post.author.firstName} {post.author.lastName}
                                        </td>
                                        <td className="px-6 py-4 text-text-secondary font-medium tabular-nums">
                                            {format(post.createdAt, "d. MMM yyyy", { locale: nb })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/admin/posts/${post.id}/edit`}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
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
                </div>
            )}
        </div>
    );
}
