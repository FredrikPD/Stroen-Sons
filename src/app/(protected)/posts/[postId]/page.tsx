import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import PageTitleUpdater from "@/components/layout/PageTitleUpdater";
import { Avatar } from "@/components/Avatar";
import ReactMarkdown from "react-markdown";
import { ensureMember } from "@/server/auth/ensureMember";

// Force dynamic rendering since we are fetching specific post
export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ postId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { postId } = await params;
    const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { title: true }
    });

    if (!post) return { title: "Innlegg ikke funnet" };

    return {
        title: `${post.title} | Strøen Søns`,
    };
}

export default async function PostDetailPage({ params }: PageProps) {
    const { postId } = await params;

    // Fetch current user for permission check
    const currentUser = await ensureMember();

    const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
            author: true,
            attachments: true,
        },
    });

    if (!post) return notFound();

    // Helper to format date
    const date = new Date(post.createdAt).toLocaleDateString("no-NO", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });

    // Helper for category style
    const getCategoryStyle = (category: string) => {
        switch (category) {
            case "EVENT": return "bg-red-50 text-red-600 border-red-100";
            case "REFERAT": return "bg-amber-50 text-amber-700 border-amber-100";
            case "SOSIALT": return "bg-emerald-50 text-emerald-700 border-emerald-100";
            case "NYHET":
            default: return "bg-blue-50 text-blue-600 border-blue-100";
        }
    };

    const authorName = [post.author.firstName, post.author.lastName]
        .filter(Boolean)
        .join(" ") || post.author.email;

    // Default role fallback if none exists in DB (though PostItem implies it might be undefined)
    // Since PostItem interface uses optional role?: string, we handle undefined
    const authorRole = (post.author as any).role || "Medlem";

    return (
        <div className="max-w-6xl mx-auto w-full pb-12">
            <PageTitleUpdater title={post.title} />


            {/* Main Card */}
            <article className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 md:p-8">
                    {/* Header Row: Author & Category */}
                    <div className="flex justify-between items-start mb-8">
                        <div className="flex items-center gap-3">
                            <Avatar
                                initials={post.author.firstName ? `${post.author.firstName[0]}${post.author.lastName ? post.author.lastName[0] : ""}` : "?"}
                                size="md"
                            />
                            <div className="flex flex-col">
                                <span className="font-bold text-gray-900 text-sm">{authorName}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-blue-50 text-blue-600 border-blue-100 w-fit">{authorRole}</span>
                                    <span className="text-gray-500 text-[10px]">•</span>
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                        {date}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${getCategoryStyle(post.category)}`}>
                            {post.category}
                        </span>
                    </div>
                    {/* Title */}
                    <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-6 leading-tight tracking-tight">
                        {post.title}
                    </h1>

                    {/* Divider */}
                    <div className="w-full h-px bg-gray-100 mb-8" />

                    {/* Content */}
                    <div className="prose prose-sm prose-zinc max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-indigo-600 prose-li:text-gray-600">
                        <ReactMarkdown>{post.content}</ReactMarkdown>
                    </div>

                    {/* Attachments */}
                    {post.attachments && post.attachments.length > 0 && (
                        <div className="space-y-2 mt-8 border-t border-gray-100 pt-8">
                            <h3 className="text-sm font-bold text-gray-900 mb-4">Vedlegg</h3>
                            {post.attachments.map((file) => (
                                <a
                                    key={file.id}
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors group"
                                >
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200 text-indigo-600 group-hover:border-indigo-200 transition-colors">
                                        <span className="material-symbols-outlined">description</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{file.name}</span>
                                        <span className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB • {file.type.split("/")[1]?.toUpperCase() || "FIL"}</span>
                                    </div>
                                    <span className="material-symbols-outlined text-gray-400 ml-auto group-hover:text-indigo-600">download</span>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </article>
        </div>
    );
}
