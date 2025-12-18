"use server";

import { prisma } from "@/server/db";
import { ensureMember } from "@/server/auth/ensureMember";
import type { PostWithDetails } from "@/components/posts/PostItem";
import { unstable_cache } from "next/cache";

export type GetPostsParams = {
    cursor?: string;
    limit?: number;
    search?: string;
    sort?: "newest" | "oldest";
    category?: string;
};

export async function getPosts({
    cursor,
    limit = 10,
    search = "",
    sort = "newest",
    category = "ALL",
}: GetPostsParams = {}) {
    const member = await ensureMember();
    if (!member) {
        throw new Error("Unauthorized");
    }

    const getCachedPosts = unstable_cache(
        async (params: GetPostsParams) => {
            const { cursor, limit = 10, search = "", sort = "newest", category = "ALL" } = params;

            const where: any = {};
            if (search) {
                where.OR = [
                    { title: { contains: search, mode: "insensitive" } },
                    { content: { contains: search, mode: "insensitive" } },
                ];
            }

            if (category && category !== "ALL") {
                where.category = category;
            }

            const posts = await prisma.post.findMany({
                take: limit + 1,
                skip: cursor ? 1 : 0,
                cursor: cursor ? { id: cursor } : undefined,
                where,
                orderBy: {
                    createdAt: sort === "oldest" ? "asc" : "desc",
                },
                include: {
                    author: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                    event: {
                        select: {
                            title: true,
                            id: true,
                        },
                    },
                    _count: {
                        select: { comments: true },
                    },
                },
                cacheStrategy: { ttl: 60, swr: 60 }
            });

            let nextCursor: string | undefined = undefined;
            if (posts.length > limit) {
                const nextItem = posts.pop();
                nextCursor = nextItem?.id;
            }

            return {
                items: posts as unknown as PostWithDetails[],
                nextCursor,
            };
        },
        ["posts-list-action"],
        { revalidate: 60, tags: ["posts"] }
    );

    return getCachedPosts({ cursor, limit, search, sort, category });
}
