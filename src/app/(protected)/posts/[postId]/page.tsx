import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import PageTitleUpdater from "@/components/layout/PageTitleUpdater";
import { Avatar } from "@/components/Avatar";
import ReactMarkdown from "react-markdown";
import { ensureMember } from "@/server/auth/ensureMember";
import { getCategoryStyleString } from "@/lib/category-colors";
import Link from "next/link";

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
        include: { author: true, attachments: true },
    });

    if (!post) return notFound();

    const day = new Date(post.createdAt).toLocaleDateString("nb-NO", { day: "numeric" });
    const mon = new Date(post.createdAt)
        .toLocaleDateString("nb-NO", { month: "short" })
        .replace(".", "")
        .toUpperCase();
    const fullDate = new Date(post.createdAt).toLocaleDateString("nb-NO", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    const categoryRecord = await prisma.category.findUnique({ where: { name: post.category } });
    const categoryStyle = getCategoryStyleString(categoryRecord?.color || "gray");

    const authorName =
        [post.author.firstName, post.author.lastName].filter(Boolean).join(" ") || post.author.email;

    return (
        <div className="w-full pb-12 flex flex-col gap-6">
            <PageTitleUpdater title={post.title} />

            {/* Article card */}
            <article className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                {/* Date bar + category */}
                <div className="flex items-stretch border-b border-gray-100">
                    {/* Date column */}
                    <div className="flex flex-col items-center justify-center px-5 py-4 bg-gray-50 border-r border-gray-100 shrink-0 w-20">
                        <span
                            className="text-2xl font-normal leading-none text-gray-900"
                            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                        >
                            {day}
                        </span>
                        <span className="text-[9px] font-bold tracking-widest text-gray-400 mt-1">{mon}</span>
                    </div>

                    {/* Meta */}
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-4 px-6 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <Avatar
                                src={post.author.avatarUrl ?? null}
                                initials={
                                    post.author.firstName
                                        ? `${post.author.firstName[0]}${post.author.lastName ? post.author.lastName[0] : ""}`
                                        : "?"
                                }
                                size="sm"
                            />
                            <div>
                                <p className="text-[13px] font-semibold text-gray-900 leading-tight">{authorName}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">{fullDate}</p>
                            </div>
                        </div>
                        <span
                            className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-[0.15em] border shrink-0 ${categoryStyle}`}
                        >
                            {post.category}
                        </span>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 md:px-10 py-8 flex flex-col gap-6">
                    {/* Title */}
                    <h1
                        className="text-2xl md:text-3xl font-normal text-gray-900 leading-tight"
                        style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                    >
                        {post.title}
                    </h1>

                    <div className="h-px bg-gray-100" />

                    {/* Content */}
                    <div className="prose prose-sm prose-zinc max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-gray-800 prose-a:underline prose-li:text-gray-600">
                        <ReactMarkdown>{post.content}</ReactMarkdown>
                    </div>

                    {/* Attachments */}
                    {post.attachments && post.attachments.length > 0 && (
                        <div className="space-y-2 border-t border-gray-100 pt-6">
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-3">
                                Vedlegg
                            </p>
                            {post.attachments.map((file) => (
                                <a
                                    key={file.id}
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors group"
                                >
                                    <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-gray-200 shrink-0">
                                        <span className="material-symbols-outlined text-[16px] text-gray-400">
                                            description
                                        </span>
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
                </div>
            </article>
        </div>
    );
}
