"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import PostItem, { PostWithDetails } from "./PostItem";
import { getPosts } from "@/server/actions/posts";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

export default function PostList() {
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
                if (entries[0].isIntersecting && hasMore) {
                    fetchPosts(cursor);
                }
            });
            if (node) observer.current.observe(node);
        },
        [loading, hasMore, cursor]
    );

    const fetchPosts = async (nextCursor?: string) => {
        try {
            setLoading(true);

            console.log("Fetching posts...", { nextCursor, search, sort, category });
            // Call Server Action
            const data = await getPosts({
                cursor: nextCursor,
                limit: 10,
                search,
                sort: sort as "newest" | "oldest",
                category,
            });
            console.log("Fetched posts:", data);

            // Server actions return Date objects, JSON returns strings. PostWithDetails interface needs to handle Date.
            // Or we check PostItem. Assuming PostItem handles it (uses new Date()).
            setPosts((prev) => (nextCursor ? [...prev, ...data.items] : data.items));
            setCursor(data.nextCursor);
            setHasMore(!!data.nextCursor);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setCursor(undefined);
            fetchPosts(undefined);
        }, 500);
        return () => clearTimeout(timer);
    }, [search, sort, category]);

    return (
        <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto">
            {/* Header & Controls */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-4xl font-bold text-[#1A1A1A] tracking-tight">Siste Nytt & Oppdateringer</h1>
                    <p className="text-gray-500 text-lg">Hold deg oppdatert med de siste historiene, referater fra møter og kunngjøringer fra styret.</p>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full sm:max-w-md">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <span className="material-symbols-outlined text-[1.1rem]">search</span>
                        </div>
                        <input
                            type="text"
                            placeholder="Søk i innlegg..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white text-gray-800 pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 shadow-sm focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-all placeholder:text-gray-400 text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {/* Category Dropdown */}
                        <div className="relative">
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="appearance-none bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 pr-10 rounded-lg border border-gray-200 shadow-sm focus:outline-none transition-colors cursor-pointer"
                            >
                                <option value="ALL">Alle kategorier</option>
                                <option value="EVENT">Event</option>
                                <option value="NYHET">Nyhet</option>
                                <option value="REFERAT">Referat</option>
                                <option value="SOSIALT">Sosialt</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[1.1rem]">expand_more</span>
                        </div>

                        {/* Sort Dropdown */}
                        <div className="relative">
                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value)}
                                className="appearance-none bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 pr-10 rounded-lg border border-gray-200 shadow-sm focus:outline-none transition-colors cursor-pointer"
                            >
                                <option value="newest">Nyeste først</option>
                                <option value="oldest">Eldste først</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[1.1rem]">expand_more</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex flex-col gap-6">
                {posts.map((post, index) => {
                    const currentMonth = format(new Date(post.createdAt), "MMMM yyyy", { locale: nb });
                    const prevMonth = index > 0
                        ? format(new Date(posts[index - 1].createdAt), "MMMM yyyy", { locale: nb })
                        : null;

                    const showSeparator = currentMonth !== prevMonth;

                    return (
                        <div key={post.id} className="flex flex-col gap-6">
                            {showSeparator && (
                                <div className="flex items-center gap-4 py-2 mt-4 first:mt-0">
                                    <div className="text-sm font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                        {currentMonth}
                                    </div>
                                    <div className="h-px bg-gray-200 w-full" />
                                </div>
                            )}

                            {posts.length === index + 1 ? (
                                <div ref={lastPostElementRef}>
                                    <PostItem post={post} />
                                </div>
                            ) : (
                                <PostItem post={post} />
                            )}
                        </div>
                    );
                })}
            </div>

            {
                loading && (
                    <div className="flex justify-center p-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                )
            }

            {
                !loading && posts.length === 0 && (
                    <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                            <span className="material-symbols-outlined text-gray-400 text-2xl">post_add</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Ingen innlegg funnet</h3>
                        <p className="text-gray-500 text-sm mt-1">Prøv å endre søkeord eller kom tilbake senere.</p>
                    </div>
                )
            }
        </div>
    );
}
