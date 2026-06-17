import { Metadata } from "next";
import Link from "next/link";
import { type Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { ensureMember } from "@/server/auth/ensureMember";
import { withPrismaRetry } from "@/server/prismaResilience";
import { getPinnedPosts } from "@/server/actions/posts";
import PostList, { type CategoryWithCount } from "@/components/posts/PostList";
import { type FeaturedPostData } from "@/components/posts/FeaturedPost";
import { FeaturedRow } from "@/components/posts/FeaturedRow";
import { PostsSidebar, type ArchiveMonth, type SidebarPinned } from "@/components/posts/PostsSidebar";
import { SERIF } from "@/components/posts/postPresentation";

export const metadata: Metadata = {
    title: "Nyheter",
    description: "Nyheter og oppdateringer fra klubben.",
};

/* ── Queries ──────────────────────────────────────────────────── */

type FeaturedPayload = Prisma.PostGetPayload<{
    include: {
        author: { select: { firstName: true; lastName: true; avatarUrl: true; email: true } };
        event: { select: { id: true; title: true; coverImage: true } };
    };
}>;

/** Featured = the most-recent pinned post, falling back to the single
    most-recent post when nothing is pinned. */
const getFeaturedPost = async (): Promise<FeaturedPayload | null> => {
    const include = {
        author: { select: { firstName: true, lastName: true, avatarUrl: true, email: true } },
        event: { select: { id: true, title: true, coverImage: true } },
    } as const;

    const pinned = await prisma.post.findFirst({
        where: { isPinned: true },
        orderBy: { createdAt: "desc" },
        include,
    });
    if (pinned) return pinned as unknown as FeaturedPayload;

    return (await prisma.post.findFirst({
        orderBy: { createdAt: "desc" },
        include,
    })) as unknown as FeaturedPayload | null;
};

const MONTHS_NB = [
    "Januar", "Februar", "Mars", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Desember",
];

/* ── Page ─────────────────────────────────────────────────────── */

export default async function PostsPage() {
    const member = await ensureMember();
    const isAdmin = member?.role === "ADMIN";
    const isEditor = member?.role === "ADMIN" || member?.role === "MODERATOR";

    const [categories, groupedCounts, totalCount, featuredRaw, pinnedRaw, archiveRows] =
        await Promise.all([
            withPrismaRetry(() => prisma.category.findMany({ orderBy: { name: "asc" } }), {
                operationName: "posts:categories",
            }),
            withPrismaRetry(
                () => prisma.post.groupBy({ by: ["category"], _count: { _all: true } }),
                { operationName: "posts:groupBy" }
            ),
            withPrismaRetry(() => prisma.post.count(), { operationName: "posts:count" }),
            withPrismaRetry(() => getFeaturedPost(), { operationName: "posts:featured" }),
            getPinnedPosts(),
            withPrismaRetry(() => prisma.post.findMany({ select: { createdAt: true } }), {
                operationName: "posts:archive",
            }),
        ]);

    // Per-category counts (default to 0 for categories with no posts).
    // Accelerate strips the groupBy payload type — cast like dashboard/page.tsx.
    const countMap: Record<string, number> = {};
    for (const row of groupedCounts as unknown as { category: string; _count: { _all: number } }[]) {
        countMap[row.category] = row._count._all;
    }
    const categoriesWithCounts: CategoryWithCount[] = categories.map((c) => ({
        name: c.name,
        color: c.color,
        count: countMap[c.name] ?? 0,
    }));

    // Archive: group all posts by month, newest-first, labelled in nb-NO.
    const archiveMap = new Map<string, { label: string; count: number; sort: number }>();
    for (const row of archiveRows) {
        const d = new Date(row.createdAt);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const existing = archiveMap.get(key);
        if (existing) {
            existing.count += 1;
        } else {
            archiveMap.set(key, {
                label: `${MONTHS_NB[d.getMonth()]} ${d.getFullYear()}`,
                count: 1,
                sort: d.getFullYear() * 12 + d.getMonth(),
            });
        }
    }
    const archive: ArchiveMonth[] = Array.from(archiveMap.values())
        .sort((a, b) => b.sort - a.sort)
        .map(({ label, count }) => ({ label, count }));

    const featured: FeaturedPostData | null = featuredRaw
        ? { ...featuredRaw, createdAt: new Date(featuredRaw.createdAt) }
        : null;
    const featuredCategoryColor = featured
        ? categories.find((c) => c.name === featured.category)?.color
        : undefined;

    const pinnedTyped = pinnedRaw as unknown as {
        id: string;
        title: string;
        category: string;
        createdAt: Date;
        author: { firstName: string | null; lastName: string | null; email: string };
    }[];
    const pinned: SidebarPinned[] = pinnedTyped.map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category,
        createdAt: new Date(p.createdAt),
        author: {
            firstName: p.author.firstName,
            lastName: p.author.lastName,
            email: p.author.email,
        },
    }));

    return (
        <div className="max-w-7xl mx-auto pb-12">

            {/* ── Header ── */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-3">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">
                        Fra foreningen
                    </p>
                    <h1
                        className="text-3xl sm:text-4xl font-normal text-gray-900 leading-none"
                        style={{ fontFamily: SERIF }}
                    >
                        Nyheter
                    </h1>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    {isEditor && (
                        <Link
                            href="/admin/posts/new"
                            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-[#0f0e0c] text-white text-[12px] font-bold hover:bg-[#0f0e0c]/90 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                            Nytt innlegg
                        </Link>
                    )}
                </div>
            </div>

            <div className="h-px bg-gray-300 mb-8" />

            {/* ── Top section: featured post + Festet/Arkiv (equal heights) ── */}
            {featured ? (
                <FeaturedRow
                    featured={featured}
                    categoryColor={featuredCategoryColor}
                    sidebar={<PostsSidebar pinned={pinned} archive={archive} />}
                />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10 items-start">
                    <div className="lg:col-span-2 min-w-0" />
                    <div className="min-w-0">
                        <PostsSidebar pinned={pinned} archive={archive} />
                    </div>
                </div>
            )}

            {/* ── Alle innlegg (full width) ── */}
            <PostList
                isAdmin={isAdmin}
                categoriesWithCounts={categoriesWithCounts}
                totalCount={totalCount}
            />
        </div>
    );
}
