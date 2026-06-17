import Link from "next/link";
import Image from "next/image";
import { Avatar } from "@/components/Avatar";
import { getCategoryStyleString } from "@/lib/category-colors";
import { SERIF, readingTime, stripMarkdown } from "./postPresentation";

export type FeaturedPostData = {
    id: string;
    title: string;
    content: string;
    category: string;
    isPinned: boolean;
    createdAt: Date;
    author: {
        firstName: string | null;
        lastName: string | null;
        avatarUrl?: string | null;
        email: string;
    };
    event?: { id: string; title: string; coverImage?: string | null } | null;
};

/** Large landscape hero card at the top of the feed. The "FESTET" badge is
    only shown when the featured post is actually pinned. */
export function FeaturedPost({
    post,
    categoryColor,
    fill = false,
}: {
    post: FeaturedPostData;
    categoryColor?: string;
    /** When true the card height is driven externally (to match the sidebar);
        the preview then grows to fill it. Otherwise the preview is capped. */
    fill?: boolean;
}) {
    const authorName =
        [post.author.firstName, post.author.lastName].filter(Boolean).join(" ") || post.author.email;

    const categoryStyle = categoryColor
        ? getCategoryStyleString(categoryColor)
        : "bg-gray-50 text-gray-500 border-gray-200";

    const dateDisplay = new Date(post.createdAt).toLocaleDateString("nb-NO", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    const minutes = readingTime(post.content);
    const hasImage = !!post.event?.coverImage;
    const preview = stripMarkdown(post.content);

    const body = (
        <div className="flex flex-col h-full p-5 sm:p-6">
            <div className="flex items-center gap-2.5 mb-2.5">
                {post.isPinned && !hasImage && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#0f0e0c] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white">
                        <span className="material-symbols-outlined text-[11px]">push_pin</span>
                        Festet
                    </span>
                )}
                <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-[0.15em] border ${categoryStyle}`}>
                    {post.category}
                </span>
                <span className="text-[11px] text-gray-400">{dateDisplay}</span>
            </div>

            <Link href={`/posts/${post.id}`} className="block">
                <h2
                    className="text-xl sm:text-2xl font-normal text-gray-900 leading-snug group-hover:text-gray-600 transition-colors"
                    style={{ fontFamily: SERIF }}
                >
                    {post.title}
                </h2>
            </Link>

            {/* Preview grows to fill the card height (matched to the sidebar
                when fill=true), with a soft fade where the text clips. */}
            <div className={`relative overflow-hidden mt-2 ${fill ? "flex-1 min-h-[3.5rem]" : "max-h-[7rem] sm:max-h-[10rem]"}`}>
                <p className="text-[13px] text-gray-500 leading-relaxed">
                    {preview}
                </p>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white to-transparent" />
            </div>

            <div className="flex items-center justify-between gap-3 mt-4">
                <div className="flex items-center gap-2 min-w-0">
                    <Avatar
                        src={post.author.avatarUrl ?? null}
                        initials={
                            post.author.firstName
                                ? `${post.author.firstName[0]}${post.author.lastName ? post.author.lastName[0] : ""}`
                                : "?"
                        }
                        size="sm"
                    />
                    <span className="text-[12px] text-gray-500 truncate">{authorName}</span>
                    <span className="text-gray-300">&middot;</span>
                    <span className="text-[12px] text-gray-400 whitespace-nowrap">{minutes} min lesing</span>
                </div>

                <Link
                    href={`/posts/${post.id}`}
                    className="inline-flex items-center gap-1 shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 group-hover:text-gray-900 transition-colors"
                >
                    Les innlegget
                    <span className="material-symbols-outlined text-[14px] group-hover:translate-x-0.5 transition-transform">
                        arrow_forward
                    </span>
                </Link>
            </div>
        </div>
    );

    // No cover image → compact text-only card (no placeholder).
    if (!hasImage) {
        return (
            <article className="group h-full bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all overflow-hidden">
                {body}
            </article>
        );
    }

    return (
        <article className="group h-full grid grid-cols-1 sm:grid-cols-2 bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all overflow-hidden">
            <Link href={`/posts/${post.id}`} className="relative block aspect-[16/9] sm:aspect-auto overflow-hidden">
                <Image
                    src={post.event!.coverImage!}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(min-width: 640px) 50vw, 100vw"
                />
                {post.isPinned && (
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-[#0f0e0c]/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                        <span className="material-symbols-outlined text-[12px]">push_pin</span>
                        Festet
                    </span>
                )}
            </Link>

            {body}
        </article>
    );
}
