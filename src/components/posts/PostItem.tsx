"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Avatar } from "@/components/Avatar";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { togglePinPost, deletePost } from "@/server/actions/posts";
import { useRouter } from "next/navigation";
import { useModal } from "@/components/providers/ModalContext";

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
    event?: { id: string; title: string } | null;
    attachments: { id: string; url: string; name: string; size: number; type: string }[];
};

export default function PostItem({
    post,
    isAdmin,
    onDelete,
    categoryColorMap = {},
}: {
    post: PostWithDetails;
    isAdmin: boolean;
    onDelete?: (id: string) => void;
    categoryColorMap?: Record<string, string>;
}) {
    const authorName =
        [post.author.firstName, post.author.lastName].filter(Boolean).join(" ") || post.author.email;

    const categoryStyle = categoryColorMap[post.category] || "bg-gray-50 text-gray-500 border-gray-200";

    const dateDisplay = new Date(post.createdAt).toLocaleDateString("nb-NO", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });

    const [isTruncated, setIsTruncated] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (contentRef.current) {
            setIsTruncated(contentRef.current.scrollHeight > contentRef.current.clientHeight);
        }
    }, [post.content]);

    return (
        <article className="bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all overflow-hidden">
            <div className="px-5 pt-5 flex flex-col gap-4">

                {/* Top row: title + date + menu */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="flex items-start gap-2 min-w-0">
                        {post.isPinned && (
                            <span className="material-symbols-outlined text-[13px] text-gray-400 mt-1 shrink-0">push_pin</span>
                        )}
                        <h2
                            className="text-xl font-normal text-gray-900 leading-snug"
                            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                        >
                            {post.title}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2 sm:shrink-0 sm:mt-0.5">
                        <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-[0.15em] border ${categoryStyle}`}>
                            {post.category}
                        </span>
                        <span className="text-[10px] text-gray-400">{dateDisplay}</span>
                        <PostMenu post={post} isAdmin={isAdmin} onDelete={onDelete} />
                    </div>
                </div>

                {/* Hairline */}
                <div className="h-px bg-gray-100" />

                {/* Content preview */}
                <div
                    ref={contentRef}
                    className="text-gray-500 text-[13px] leading-relaxed line-clamp-6 prose prose-sm prose-zinc max-w-none prose-p:text-gray-500 prose-p:my-0 prose-a:text-gray-700"
                >
                    <ReactMarkdown>{post.content}</ReactMarkdown>
                </div>

                {/* Attachments */}
                {post.attachments && post.attachments.length > 0 && (
                    <div className="space-y-1.5">
                        {post.attachments.map((file) => (
                            <a
                                key={file.id}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2.5 p-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors group/att"
                            >
                                <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center border border-gray-200 shrink-0">
                                    <span className="material-symbols-outlined text-[14px] text-gray-400">description</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[12px] font-semibold text-gray-700 group-hover/att:text-gray-900 transition-colors truncate block">
                                        {file.name}
                                    </span>
                                    <span className="text-[10px] text-gray-400">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB &middot;{" "}
                                        {file.type.split("/")[1]?.toUpperCase() || "FIL"}
                                    </span>
                                </div>
                                <span className="material-symbols-outlined text-[16px] text-gray-400 shrink-0">download</span>
                            </a>
                        ))}
                    </div>
                )}

                {/* Footer: author + read more */}
                <div className="flex items-center justify-between gap-2 py-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                        <Avatar
                            src={post.author.avatarUrl ?? null}
                            initials={
                                post.author.firstName
                                    ? `${post.author.firstName[0]}${post.author.lastName ? post.author.lastName[0] : ""}`
                                    : "?"
                            }
                            size="sm"
                        />
                        <span className="text-[11px] text-gray-400">{authorName}</span>
                    </div>
                    {isTruncated && (
                        <Link
                            href={`/posts/${post.id}`}
                            className="flex items-center gap-1 text-gray-400 hover:text-gray-900 transition-colors group/link"
                        >
                            <span className="text-[10px] font-bold uppercase tracking-wider">Les mer</span>
                            <span className="material-symbols-outlined text-[13px] group-hover/link:translate-x-0.5 transition-transform">
                                arrow_forward
                            </span>
                        </Link>
                    )}
                </div>
            </div>
        </article>
    );
}

function PostMenu({
    post,
    isAdmin,
    onDelete,
}: {
    post: PostWithDetails;
    isAdmin: boolean;
    onDelete?: (id: string) => void;
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
                            toast.promise(togglePinPost(post.id), {
                                loading: "Oppdaterer...",
                                success: "Innlegg oppdatert!",
                                error: "Noe gikk galt",
                            });
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
