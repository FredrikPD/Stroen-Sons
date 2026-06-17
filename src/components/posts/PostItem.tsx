"use client";

import Link from "next/link";
import Image from "next/image";
import { Avatar } from "@/components/Avatar";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { togglePinPost, deletePost } from "@/server/actions/posts";
import { useRouter } from "next/navigation";
import { useModal } from "@/components/providers/ModalContext";
import { SERIF, StripePlaceholder, excerpt, readingTime } from "./postPresentation";

export type PostWithDetails = {
    id: string;
    title: string;
    content: string;
    category: string;
    isPinned: boolean;
    createdAt: string;
    author: {
        firstName: string | null;
        lastName: string | null;
        avatarUrl?: string | null;
        email: string;
        role?: string;
    };
    event?: { id: string; title: string; coverImage?: string | null } | null;
    attachments: { id: string; url: string; name: string; size: number; type: string }[];
};

export default function PostItem({
    post,
    isAdmin,
    onDelete,
    onTogglePin,
    categoryColorMap = {},
}: {
    post: PostWithDetails;
    isAdmin: boolean;
    onDelete?: (id: string) => void;
    onTogglePin?: (id: string, isPinned: boolean) => void;
    categoryColorMap?: Record<string, string>;
}) {
    const authorName =
        [post.author.firstName, post.author.lastName].filter(Boolean).join(" ") || post.author.email;

    const categoryStyle = categoryColorMap[post.category] || "bg-gray-50 text-gray-500 border-gray-200";

    const dateDisplay = new Date(post.createdAt).toLocaleDateString("nb-NO", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    const minutes = readingTime(post.content);
    const preview = excerpt(post.content, 200);

    // Thumbnail rule: render a thumbnail IFF the post has a linked event.
    const hasThumb = !!post.event;

    return (
        <article className="group relative flex gap-4 sm:gap-5 rounded-xl p-4 -mx-4 cursor-pointer bg-white/40 hover:bg-white/70 transition-colors">
            {/* Thumbnail — only when a post is linked to an event */}
            {hasThumb && (
                <div className="relative shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border border-gray-200">
                    {post.event?.coverImage ? (
                        <Image
                            src={post.event.coverImage}
                            alt={post.title}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                            sizes="112px"
                        />
                    ) : (
                        <StripePlaceholder label={post.category.toLowerCase()} className="w-full h-full" />
                    )}
                </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
                {/* Eyebrow: category chip + date + (admin menu) */}
                <div className="flex items-center gap-2.5 mb-2">
                    <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-[0.15em] border ${categoryStyle}`}>
                        {post.category}
                    </span>
                    {post.isPinned && (
                        <span className="material-symbols-outlined text-[13px] text-gray-400">push_pin</span>
                    )}
                    <span className="text-[11px] text-gray-400">{dateDisplay}</span>
                    <div className="ml-auto relative z-10">
                        <PostMenu post={post} isAdmin={isAdmin} onDelete={onDelete} onTogglePin={onTogglePin} />
                    </div>
                </div>

                {/* Title — stretched link makes the whole card clickable */}
                <Link
                    href={`/posts/${post.id}`}
                    className="block after:absolute after:inset-0 after:content-['']"
                >
                    <h2
                        className="text-xl font-normal text-gray-900 leading-snug group-hover:text-gray-600 transition-colors"
                        style={{ fontFamily: SERIF }}
                    >
                        {post.title}
                    </h2>
                </Link>

                {/* Excerpt */}
                {preview && (
                    <p className="text-[13px] text-gray-500 leading-relaxed line-clamp-2 mt-1.5">
                        {preview}
                    </p>
                )}

                {/* Author + reading time + read cue */}
                <div className="flex items-center justify-between gap-3 mt-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <Avatar
                            src={post.author.avatarUrl ?? null}
                            initials={
                                post.author.firstName
                                    ? `${post.author.firstName[0]}${post.author.lastName ? post.author.lastName[0] : ""}`
                                    : "?"
                            }
                            size="xs"
                        />
                        <span className="text-[11px] text-gray-500 truncate">{authorName}</span>
                        <span className="text-gray-300">&middot;</span>
                        <span className="text-[11px] text-gray-400 whitespace-nowrap">{minutes} min lesing</span>
                    </div>
                    <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 group-hover:text-gray-900 transition-colors">
                        Les innlegget
                        <span className="material-symbols-outlined text-[14px] group-hover:translate-x-0.5 transition-transform">
                            arrow_forward
                        </span>
                    </span>
                </div>
            </div>
        </article>
    );
}

function PostMenu({
    post,
    isAdmin,
    onDelete,
    onTogglePin,
}: {
    post: PostWithDetails;
    isAdmin: boolean;
    onDelete?: (id: string) => void;
    onTogglePin?: (id: string, isPinned: boolean) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { openConfirm, openAlert } = useModal();

    const handleDelete = async () => {
        setIsOpen(false);
        const confirmed = await openConfirm({
            title: "Slett innlegg",
            message: `Er du sikker på at du vil slette "${post.title}"? Dette kan ikke angres.`,
            type: "error",
            confirmText: "Slett",
            cancelText: "Avbryt",
        });

        if (!confirmed) return;

        try {
            const result = await deletePost(post.id);
            if (result.success) {
                toast.success("Innlegget ble slettet");
                router.refresh();
                if (onDelete) onDelete(post.id);
            } else {
                await openAlert({ title: "Feil", message: result.error || "Kunne ikke slette innlegget", type: "error" });
            }
        } catch {
            await openAlert({ title: "Feil", message: "En feil oppstod", type: "error" });
        }
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!isAdmin) return null;

    return (
        <div className="relative shrink-0" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-gray-400 hover:text-gray-600 w-7 h-7 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
            >
                <span className="material-symbols-outlined text-[18px]">more_horiz</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-10 animate-in fade-in zoom-in-95 duration-200">
                    <button
                        onClick={async () => {
                            setIsOpen(false);
                            const newPinned = !post.isPinned;
                            onTogglePin?.(post.id, newPinned); // optimistic — icon + label update now
                            const res = await togglePinPost(post.id);
                            if (res?.success) {
                                toast.success(newPinned ? "Innlegget ble festet" : "Innlegget ble løsnet");
                                router.refresh(); // keep the featured card / sidebar in sync
                            } else {
                                onTogglePin?.(post.id, post.isPinned); // revert
                                toast.error(res?.error || "Noe gikk galt");
                            }
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg text-gray-400">
                            {post.isPinned ? "keep_off" : "push_pin"}
                        </span>
                        {post.isPinned ? "Løsne innlegg" : "Fest innlegg"}
                    </button>

                    <Link
                        href={`/admin/posts/${post.id}/edit`}
                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg text-gray-400">edit</span>
                        Rediger
                    </Link>

                    <button
                        onClick={handleDelete}
                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg text-red-500">delete</span>
                        Slett
                    </button>
                </div>
            )}
        </div>
    );
}
