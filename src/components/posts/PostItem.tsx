"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
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
    event?: {
        id: string;
        title: string;
    } | null;
    attachments: {
        id: string;
        url: string;
        name: string;
        size: number;
        type: string;
    }[];
};

export default function PostItem({ post, isAdmin, onDelete, categoryColorMap = {} }: { post: PostWithDetails, isAdmin: boolean, onDelete?: (id: string) => void, categoryColorMap?: Record<string, string> }) {
    // Fallback for name
    const authorName = [post.author.firstName, post.author.lastName]
        .filter(Boolean)
        .join(" ") || post.author.email;


    const categoryStyle = categoryColorMap[post.category] || "bg-blue-50 text-blue-600 border-blue-100";

    const [isTruncated, setIsTruncated] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (contentRef.current) {
            setIsTruncated(contentRef.current.scrollHeight > contentRef.current.clientHeight);
        }
    }, [post.content]);

    return (
        <article className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
            {/* Header Group: Author & Title */}
            <div className="flex flex-col gap-3 pb-2">
                {/* Author Row */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <Avatar
                            src={post.author.avatarUrl ?? null}
                            initials={post.author.firstName ? `${post.author.firstName[0]}${post.author.lastName ? post.author.lastName[0] : ""}` : "?"}
                            size="md"
                        />
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900">{authorName}</span>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${categoryStyle}`}>
                                    {post.category}
                                </span>
                                <span className="text-[10px] text-gray-400">•</span>
                                <span className="text-xs text-gray-500">
                                    {new Date(post.createdAt).toLocaleDateString("no-NO", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>
                    {/* Menu */}
                    <PostMenu post={post} isAdmin={isAdmin} onDelete={onDelete} />
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-gray-900 leading-tight">
                    {post.title}
                </h2>
            </div>

            {/* Divider (Invisible spacer or visible line, using Spacer for now) */}
            <div className="h-px w-full bg-gray-200" />

            {/* Content Body */}
            <div className="py-2">
                <div
                    ref={contentRef}
                    className="text-gray-600 text-sm leading-relaxed prose prose-sm prose-zinc max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-indigo-600 prose-li:text-gray-600 line-clamp-5"
                >
                    <ReactMarkdown>{post.content}</ReactMarkdown>
                </div>
            </div>

            {/* Attachments */}
            {post.attachments && post.attachments.length > 0 && (
                <div className="space-y-2 mt-2">
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

            {/* Action Bar / Footer - Only show if truncated or has attachments logic? No, just truncation for now based on request */}
            {isTruncated && (
                <div className="pt-4 mt-2 border-t border-gray-100 flex items-center justify-between">
                    <Link
                        href={`/posts/${post.id}`}
                        className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 transition-colors group"
                    >
                        <span className="text-sm font-bold">Les mer</span>
                        <span className="material-symbols-outlined text-lg group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                    </Link>
                </div>
            )}
        </article>
    );
}

function PostMenu({ post, isAdmin, onDelete }: { post: PostWithDetails, isAdmin: boolean, onDelete?: (id: string) => void }) {
    // Client-side state for open/close would be needed if we don't use a library.
    // Simplifying for now: using a simple active state or just a button that toggles visibility
    // Actually, let's keep it simple: just buttons if we can, or a simple relative div.
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
            cancelText: "Avbryt"
        });

        if (!confirmed) return;

        try {
            const result = await deletePost(post.id);
            if (result.success) {
                toast.success("Innlegget ble slettet");
                router.refresh();
                if (onDelete) {
                    onDelete(post.id);
                }
            } else {
                await openAlert({
                    title: "Feil",
                    message: result.error || "Kunne ikke slette innlegget",
                    type: "error"
                });
            }
        } catch (error) {
            await openAlert({
                title: "Feil",
                message: "En feil oppstod",
                type: "error"
            });
        }
    };

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!isAdmin) return null;

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-gray-400 hover:text-gray-600 w-8 h-8 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center"
                title="Handlinger"
            >
                <span className="material-symbols-outlined text-lg">more_horiz</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-10 animate-in fade-in zoom-in-95 duration-200">
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
