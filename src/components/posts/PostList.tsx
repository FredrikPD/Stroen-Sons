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
        <div className="flex flex-col gap-6 w-full">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Innlegg</h1>
                <p className="text-gray-500 text-sm">
                    Siste viktige oppdateringer og diskusjoner fra medlemmene.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 border-b border-gray-100 pb-px">
                <button
                    onClick={() => setCategory("ALL")}
                    className={`text-xs font-bold pb-3 border-b-2 transition-colors ${category === "ALL" ? "text-blue-600 border-blue-600" : "text-gray-500 border-transparent hover:text-gray-900"
                        }`}
                >
                    Siste innlegg
                </button>
                <button
                    onClick={() => setCategory("PINNED")} // Mock category
                    className={`text-xs font-bold pb-3 border-b-2 transition-colors ${category === "PINNED" ? "text-blue-600 border-blue-600" : "text-gray-500 border-transparent hover:text-gray-900"
                        }`}
                >
                    Festet
                </button>
                <button
                    onClick={() => setCategory("NYHET")}
                    className={`text-xs font-bold pb-3 border-b-2 transition-colors ${category === "NYHET" ? "text-blue-600 border-blue-600" : "text-gray-500 border-transparent hover:text-gray-900"
                        }`}
                >
                    Kunngjøringer
                </button>
            </div>

            {/* List */}
            <div className="flex flex-col gap-6">
                {posts.map((post, index) => {
                    return (
                        <div key={post.id} ref={posts.length === index + 1 ? lastPostElementRef : undefined}>
                            <PostItem post={post} />
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
                !loading && posts.length > 0 && hasMore && (
                    <div className="flex justify-center pt-8 pb-12">
                        <button
                            onClick={() => fetchPosts(cursor)}
                            className="bg-white border border-gray-200 text-gray-900 px-5 py-2.5 rounded-full text-xs font-bold hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-1.5"
                        >
                            Last inn eldre innlegg
                            <span className="material-symbols-outlined text-base">expand_more</span>
                        </button>
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
