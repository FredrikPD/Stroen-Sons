import Link from "next/link";
import { SERIF } from "./postPresentation";

export type SidebarPinned = {
    id: string;
    title: string;
    category: string;
    createdAt: Date;
    author: { firstName: string | null; lastName: string | null; email: string };
};
export type ArchiveMonth = { label: string; count: number };

function CardShell({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-700 shrink-0">
                    {title}
                </span>
                <div className="flex-1 h-px bg-gray-100" />
            </div>
            {children}
        </div>
    );
}

export function PostsSidebar({
    pinned,
    archive,
}: {
    pinned: SidebarPinned[];
    archive: ArchiveMonth[];
}) {
    return (
        <div className="space-y-4">

            {/* ── Festet ── */}
            <CardShell title="Festet">
                <div className="px-4 py-3">
                    {pinned.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                            {pinned.map((post) => (
                                <Link
                                    key={post.id}
                                    href={`/posts/${post.id}`}
                                    className="block py-2.5 px-1 -mx-1 rounded-lg hover:bg-gray-50 transition-colors group"
                                >
                                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gray-400 mb-1">
                                        {post.category}
                                    </p>
                                    <p
                                        className="text-[14px] text-gray-900 leading-snug group-hover:text-gray-600 transition-colors line-clamp-2"
                                        style={{ fontFamily: SERIF }}
                                    >
                                        {post.title}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        {[post.author.firstName, post.author.lastName].filter(Boolean).join(" ") ||
                                            post.author.email}{" "}
                                        &middot;{" "}
                                        {post.createdAt.toLocaleDateString("nb-NO", {
                                            day: "numeric",
                                            month: "short",
                                        })}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400 italic py-2" style={{ fontFamily: SERIF }}>
                            Ingen festede innlegg.
                        </p>
                    )}
                </div>
            </CardShell>

            {/* ── Arkiv ── */}
            <CardShell title="Arkiv">
                <div className="px-4 py-2">
                    {archive.length > 0 ? (
                        archive.map((m) => (
                            <div key={m.label} className="flex items-center justify-between py-2">
                                <span className="text-[12px] text-gray-700">{m.label}</span>
                                <span className="text-[11px] text-gray-400 tabular-nums">{m.count}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-gray-400 italic py-2" style={{ fontFamily: SERIF }}>
                            Ingen innlegg ennå.
                        </p>
                    )}
                </div>
            </CardShell>
        </div>
    );
}
