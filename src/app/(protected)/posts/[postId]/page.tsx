import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { prisma } from "@/server/db";
import { ensureMember } from "@/server/auth/ensureMember";
import PageTitleUpdater from "@/components/layout/PageTitleUpdater";
import { Avatar } from "@/components/Avatar";
import { getCategoryColorClasses } from "@/lib/category-colors";
import { SERIF, StripePlaceholder, readingTime } from "@/components/posts/postPresentation";
import { ShareButton } from "@/components/posts/PostDetailActions";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ postId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { postId } = await params;
    const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { title: true },
    });
    if (!post) return { title: "Innlegg ikke funnet" };
    return { title: `${post.title} | Strøen Søns` };
}

export default async function PostDetailPage({ params }: PageProps) {
    const { postId } = await params;
    await ensureMember();

    const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
            author: { include: { userRole: true } },
            attachments: true,
            event: { select: { id: true, title: true, coverImage: true } },
        },
    });

    if (!post) return notFound();

    // Neighbours in the newest-first feed: "Forrige" = the more-recent post,
    // "Neste" = the older post (i.e. continue reading down the feed).
    const [newerPost, olderPost, categoryRecord] = await Promise.all([
        prisma.post.findFirst({
            where: { createdAt: { gt: post.createdAt } },
            orderBy: { createdAt: "asc" },
            select: { id: true, title: true },
        }),
        prisma.post.findFirst({
            where: { createdAt: { lt: post.createdAt } },
            orderBy: { createdAt: "desc" },
            select: { id: true, title: true },
        }),
        prisma.category.findUnique({ where: { name: post.category } }),
    ]);

    const fullDate = new Date(post.createdAt).toLocaleDateString("nb-NO", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
    const minutes = readingTime(post.content);

    const catText = getCategoryColorClasses(categoryRecord?.color || "gray").text;

    const authorName =
        [post.author.firstName, post.author.lastName].filter(Boolean).join(" ") || post.author.email;
    const initials = post.author.firstName
        ? `${post.author.firstName[0]}${post.author.lastName ? post.author.lastName[0] : ""}`
        : "?";
    const roleLabel = post.author.userRole?.name ?? null;

    // Cover: real event image → labelled placeholder when tied to an event →
    // nothing for a plain post (no generic placeholder).
    const coverImage = post.event?.coverImage ?? null;
    const showCover = !!coverImage || !!post.event;
    const coverLabel = (post.event?.title ?? post.category).toLowerCase();

    return (
        <div className="max-w-4xl mx-auto pb-16">
            <PageTitleUpdater title={post.title} backHref="/posts" backLabel="Nyheter" />

            <article className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 lg:p-10">

            {/* ── Eyebrow ── */}
            <div className="flex items-center gap-2 text-[11px] mb-2.5">
                <span className={`font-bold uppercase tracking-[0.15em] ${catText}`}>{post.category}</span>
                <span className="text-gray-300">&middot;</span>
                <span className="text-gray-400 font-medium">{fullDate}</span>
                <span className="text-gray-300">&middot;</span>
                <span className="text-gray-400 font-medium">{minutes} min lesing</span>
            </div>

            {/* ── Title ── */}
            <h1
                className="text-2xl sm:text-3xl font-normal text-gray-900 leading-tight"
                style={{ fontFamily: SERIF }}
            >
                {post.title}
            </h1>

            {/* ── Author row ── */}
            <div className="flex items-center justify-between gap-4 mt-4">
                <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar src={post.author.avatarUrl ?? null} initials={initials} size="sm" />
                    <div className="min-w-0">
                        <p className="text-[13px] font-bold text-gray-900 leading-tight">{authorName}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                            {roleLabel ? `${roleLabel} · ` : ""}publiserte {fullDate}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <ShareButton title={post.title} />
                </div>
            </div>

            <div className="h-px bg-gray-200 mt-4" />

            {/* ── Cover ── */}
            {showCover && (
                <figure className="mt-6 mb-3">
                    <div className="relative h-52 sm:h-64 rounded-2xl overflow-hidden border border-gray-200">
                        {coverImage ? (
                            <Image
                                src={coverImage}
                                alt={post.title}
                                fill
                                className="object-cover"
                                sizes="100vw"
                            />
                        ) : (
                            <StripePlaceholder label={coverLabel} className="absolute inset-0 w-full h-full" />
                        )}
                    </div>
                    {post.event && (
                        <figcaption
                            className="text-center text-[11px] text-gray-400 italic mt-3"
                            style={{ fontFamily: SERIF }}
                        >
                            <Link
                                href={`/events/${post.event.id}`}
                                className="hover:text-gray-600 transition-colors"
                            >
                                Fra arrangementet: {post.event.title}
                            </Link>
                        </figcaption>
                    )}
                </figure>
            )}

            {/* ── Body ── */}
            <div
                className={`prose prose-sm max-w-none ${showCover ? "mt-6" : "mt-7"}
                    prose-headings:font-normal prose-headings:text-gray-900
                    prose-h2:text-[19px] prose-h2:mt-9 prose-h2:mb-3
                    prose-h3:text-base prose-h3:mt-7 prose-h3:mb-2
                    prose-p:text-gray-700 prose-p:leading-[1.7]
                    prose-a:text-gray-900 prose-a:underline prose-a:decoration-gray-300
                    prose-strong:text-gray-900 prose-strong:font-semibold
                    prose-blockquote:border-l-2 prose-blockquote:border-gray-900 prose-blockquote:pl-5
                    prose-blockquote:text-[17px] prose-blockquote:text-gray-800 prose-blockquote:font-normal prose-blockquote:leading-snug
                    prose-li:text-gray-700`}
                style={{ fontFamily: SERIF }}
            >
                <ReactMarkdown>{post.content}</ReactMarkdown>
            </div>

            {/* ── Attachments ── */}
            {post.attachments && post.attachments.length > 0 && (
                <div className="space-y-2 mt-8">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-3">Vedlegg</p>
                    {post.attachments.map((file) => (
                        <a
                            key={file.id}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors group"
                        >
                            <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200 shrink-0">
                                <span className="material-symbols-outlined text-[16px] text-gray-400">description</span>
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[13px] font-semibold text-gray-800 group-hover:text-gray-900 transition-colors truncate">
                                    {file.name}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB &middot;{" "}
                                    {file.type.split("/")[1]?.toUpperCase() || "FIL"}
                                </span>
                            </div>
                            <span className="material-symbols-outlined text-gray-400 ml-auto group-hover:text-gray-600 transition-colors">
                                download
                            </span>
                        </a>
                    ))}
                </div>
            )}

            </article>

            {/* ── Prev / Next ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                {newerPost ? (
                    <Link
                        href={`/posts/${newerPost.id}`}
                        className="group rounded-xl border border-gray-200 bg-white p-3.5 hover:border-gray-300 hover:shadow-sm transition-all"
                    >
                        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
                            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                            Forrige
                        </p>
                        <p
                            className="text-[14px] text-gray-900 mt-1 line-clamp-1 group-hover:text-gray-600 transition-colors"
                            style={{ fontFamily: SERIF }}
                        >
                            {newerPost.title}
                        </p>
                    </Link>
                ) : (
                    <div className="rounded-xl border border-dashed border-gray-200" />
                )}

                {olderPost ? (
                    <Link
                        href={`/posts/${olderPost.id}`}
                        className="group rounded-xl border border-gray-200 bg-white p-3.5 text-right hover:border-gray-300 hover:shadow-sm transition-all"
                    >
                        <p className="flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
                            Neste
                            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </p>
                        <p
                            className="text-[14px] text-gray-900 mt-1 line-clamp-1 group-hover:text-gray-600 transition-colors"
                            style={{ fontFamily: SERIF }}
                        >
                            {olderPost.title}
                        </p>
                    </Link>
                ) : (
                    <div className="rounded-xl border border-dashed border-gray-200" />
                )}
            </div>
        </div>
    );
}
