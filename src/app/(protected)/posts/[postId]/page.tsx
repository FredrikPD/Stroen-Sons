import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CommentSection from "@/components/posts/CommentSection";
import PageTitleUpdater from "@/components/layout/PageTitleUpdater";

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

    const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
            author: true,
            _count: {
                select: { comments: true },
            },
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
            {/* Back Button */}
            <div className="mb-6">
                <Link
                    href="/posts"
                    className="inline-flex items-center text-gray-500 hover:text-gray-900 transition-colors font-medium text-sm"
                >
                    <span className="material-symbols-outlined mr-1 text-[1.2rem]">arrow_back</span>
                    Tilbake til feeden
                </Link>
            </div>

            {/* Main Card */}
            <article className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 md:p-8">
                    {/* Header Top Row: Category + Date */}
                    <div className="flex flex-wrap justify-between items-start gap-4 mb-5">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${getCategoryStyle(post.category)}`}>
                            {post.category}
                        </span>
                        <div className="flex items-center text-gray-400 text-xs font-medium">
                            <span className="material-symbols-outlined mr-1.5 text-[1rem]">calendar_today</span>
                            Publisert {date}
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-6 leading-tight tracking-tight">
                        {post.title}
                    </h1>

                    {/* Author */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#222] to-[#444] flex items-center justify-center text-white text-xs font-bold shadow-sm">
                            {authorName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-gray-900 text-sm">{authorName}</span>
                            <span className="text-xs text-gray-500">{authorRole}</span>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="w-full h-px bg-gray-100 mb-8" />

                    {/* Content */}
                    <div className="prose max-w-none text-gray-600 whitespace-pre-wrap leading-relaxed">
                        {post.content}
                    </div>
                </div>

                {/* Comments Section */}
                <div className="bg-gray-50 border-t border-gray-100 p-6 md:p-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-5">Kommentarer</h3>
                    <CommentSection postId={post.id} />
                </div>
            </article>
        </div>
    );
}
