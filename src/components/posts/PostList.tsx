"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import PostItem, { PostWithDetails } from "./PostItem";
import { getPosts } from "@/server/actions/posts";
import { getCategoryStyleString } from "@/lib/category-colors";

interface PostListProps {
    isAdmin: boolean;
    categories?: { id: string; name: string; color: string }[];
}

export default function PostList({ isAdmin, categories = [] }: PostListProps) {
    const categoryColorMap = useMemo(() => {
        const map: Record<string, string> = {};
        categories.forEach((cat) => {
            map[cat.name] = getCategoryStyleString(cat.color);
        });
        return map;
    }, [categories]);

    const [posts, setPosts] = useState<PostWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("newest");
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
                sort: sort as "newest" | "oldest",
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

    const allCategories = categories.length > 0
        ? categories
        : [
            { id: "NYHET", name: "NYHET", color: "gray" },
            { id: "EVENT", name: "EVENT", color: "gray" },
            { id: "REFERAT", name: "REFERAT", color: "gray" },
            { id: "SOSIALT", name: "SOSIALT", color: "gray" },
        ];

    return (
        <div className="flex flex-col gap-6 w-full">

            {/* ── Page Header ── */}
            <div className="flex items-end justify-between gap-4 pt-1">
                <div>
                    <h1
                        className="text-3xl sm:text-4xl font-normal text-gray-900 leading-none"
                        style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                    >
                        Innlegg
                    </h1>
                    <div className="flex items-center gap-3 mt-3">
                        <div className="h-px w-8 bg-gray-300" />
                        <p
                            className="text-[11px] text-gray-400 italic"
                            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                        >
                            Nyheter og oppdateringer fra klubben
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Category tabs ── */}
            <div className="flex items-center gap-0 border-b border-gray-100 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                    onClick={() => setCategory("ALL")}
                    className={`text-xs font-bold pb-3 px-4 border-b-2 transition-colors whitespace-nowrap uppercase tracking-[0.15em] ${
                        category === "ALL"
                            ? "text-gray-900 border-gray-900"
                            : "text-gray-400 border-transparent hover:text-gray-700"
                    }`}
                >
                    Alle
                </button>
                {allCategories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setCategory(cat.name)}
                        className={`text-xs font-bold pb-3 px-4 border-b-2 transition-colors whitespace-nowrap uppercase tracking-[0.15em] ${
                            category === cat.name
                                ? "text-gray-900 border-gray-900"
                                : "text-gray-400 border-transparent hover:text-gray-700"
                        }`}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* ── Post list ── */}
            <div className="flex flex-col gap-3">
                {posts.map((post, index) => (
                    <div
                        key={post.id}
                        ref={posts.length === index + 1 ? lastPostElementRef : undefined}
                    >
                        <PostItem
                            post={post}
                            isAdmin={isAdmin}
                            onDelete={handleDeletePost}
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
                    <p
                        className="text-gray-400 italic text-sm"
                        style={{ fontFamily: "'Georgia', serif" }}
                    >
                        Ingen innlegg funnet.
                    </p>
                </div>
            )}
        </div>
    );
}
