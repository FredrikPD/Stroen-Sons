"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import PostItem, { PostWithDetails } from "./PostItem";
import { getPosts } from "@/server/actions/posts";
import { getCategoryStyleString } from "@/lib/category-colors";
import { SERIF } from "./postPresentation";

export type CategoryWithCount = { name: string; color: string; count: number };

interface PostListProps {
    isAdmin: boolean;
    categoriesWithCounts?: CategoryWithCount[];
    totalCount?: number;
}

export default function PostList({
    isAdmin,
    categoriesWithCounts = [],
    totalCount = 0,
}: PostListProps) {
    const categoryColorMap = useMemo(() => {
        const map: Record<string, string> = {};
        categoriesWithCounts.forEach((cat) => {
            map[cat.name] = getCategoryStyleString(cat.color);
        });
        return map;
    }, [categoriesWithCounts]);

    const [posts, setPosts] = useState<PostWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<"newest" | "oldest">("newest");
    const [category, setCategory] = useState("ALL");
    const [cursor, setCursor] = useState<string | undefined>(undefined);
    const [hasMore, setHasMore] = useState(true);

    const observer = useRef<IntersectionObserver | null>(null);
    const lastPostElementRef = useCallback(
        (node: HTMLDivElement) => {
            if (loading) return;
            if (observer.current) observer.current.disconnect();
            observer.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && hasMore) fetchPosts(cursor);
            });
            if (node) observer.current.observe(node);
        },
        [loading, hasMore, cursor]
    );

    const fetchPosts = async (nextCursor?: string) => {
        try {
            setLoading(true);
            const data = await getPosts({
                cursor: nextCursor,
                limit: 10,
                search,
                sort,
                category,
            });
            setPosts((prev) => (nextCursor ? [...prev, ...data.items] : data.items));
            setCursor(data.nextCursor);
            setHasMore(!!data.nextCursor);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setCursor(undefined);
            fetchPosts(undefined);
        }, 500);
        return () => clearTimeout(timer);
    }, [search, sort, category]);

    const handleDeletePost = (postId: string) => {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
    };

    const handleTogglePin = (postId: string, isPinned: boolean) => {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, isPinned } : p)));
    };

    // Only show chips for categories that actually have posts — keeps it clean.
    const chipCategories = categoriesWithCounts.filter((c) => c.count > 0);

    return (
        <div className="flex flex-col gap-6 w-full">

            {/* ── Category filter chips ── */}
            <div className="flex items-center gap-2 flex-wrap">
                <FilterChip
                    label="Alle"
                    count={totalCount}
                    active={category === "ALL"}
                    onClick={() => setCategory("ALL")}
                />
                {chipCategories.map((cat) => (
                    <FilterChip
                        key={cat.name}
                        label={cat.name}
                        count={cat.count}
                        active={category === cat.name}
                        onClick={() => setCategory(cat.name)}
                    />
                ))}
            </div>

            <div className="h-px bg-gray-100" />

            {/* ── Section header + search + sort ── */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-normal text-gray-900" style={{ fontFamily: SERIF }}>
                    Alle innlegg
                </h2>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <span className="material-symbols-outlined text-[16px] text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                            search
                        </span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Søk i innlegg"
                            className="h-9 w-full sm:w-48 rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-[12px] text-gray-700 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none"
                        />
                    </div>
                    <button
                        onClick={() => setSort((s) => (s === "newest" ? "oldest" : "newest"))}
                        className="flex items-center gap-1.5 shrink-0 text-[11px] font-semibold text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        {sort === "newest" ? "Nyeste først" : "Eldste først"}
                        <span className="material-symbols-outlined text-[16px]">
                            {sort === "newest" ? "expand_more" : "expand_less"}
                        </span>
                    </button>
                </div>
            </div>

            {/* ── Post list ── */}
            <div className="flex flex-col gap-2">
                {posts.map((post, index) => (
                    <div
                        key={post.id}
                        ref={posts.length === index + 1 ? lastPostElementRef : undefined}
                    >
                        <PostItem
                            post={post}
                            isAdmin={isAdmin}
                            onDelete={handleDeletePost}
                            onTogglePin={handleTogglePin}
                            categoryColorMap={categoryColorMap}
                        />
                    </div>
                ))}
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex justify-center p-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-gray-500" />
                </div>
            )}

            {/* Load more */}
            {!loading && posts.length > 0 && hasMore && (
                <div className="flex justify-center pt-4 pb-8">
                    <button
                        onClick={() => fetchPosts(cursor)}
                        className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        Last inn eldre innlegg
                        <span className="material-symbols-outlined text-[14px]">expand_more</span>
                    </button>
                </div>
            )}

            {/* Empty state */}
            {!loading && posts.length === 0 && (
                <div className="text-center py-16">
                    <p className="text-gray-400 italic text-sm" style={{ fontFamily: SERIF }}>
                        Ingen innlegg funnet.
                    </p>
                </div>
            )}
        </div>
    );
}

function FilterChip({
    label,
    count,
    active,
    onClick,
}: {
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-colors border ${
                active
                    ? "bg-[#0f0e0c] text-white border-[#0f0e0c]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }`}
        >
            <span>{label}</span>
            <span
                className={`tabular-nums text-[10px] ${
                    active ? "text-white/55" : "text-gray-400"
                }`}
            >
                {count}
            </span>
        </button>
    );
}
