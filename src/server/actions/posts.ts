"use server";

import { prisma } from "@/server/db";
import { ensureMember } from "@/server/auth/ensureMember";
import type { PostWithDetails } from "@/components/posts/PostItem";
import { unstable_cache } from "next/cache";
import { revalidatePath } from "next/cache";
import { PostCategory } from "@prisma/client";
import { broadcastNotification } from "@/server/actions/notifications";

export type GetPostsParams = {
    cursor?: string;
    limit?: number;
    search?: string;
    sort?: "newest" | "oldest";
    category?: string;
};

export async function createPost(data: {
    title: string;
    content: string;
    category: PostCategory;
    eventId?: string;
}) {
    const member = await ensureMember();
    if (!member || member.role !== "ADMIN") {
        return { success: false, error: "Du har ikke tilgang til å opprette innlegg." };
    }

    if (!data.title || !data.content) {
        return { success: false, error: "Tittel og innhold er påkrevd." };
    }

    try {
        const post = await prisma.post.create({
            data: {
                title: data.title,
                content: data.content,
                category: data.category,
                authorId: member.id,
                eventId: data.eventId || undefined,
            },
        });

        // Notify all members
        await broadcastNotification({
            type: "POST_CREATED",
            title: "Nytt innlegg",
            message: `"${data.title}" har blitt publisert.`,
            link: `/posts/${post.id}`,
        });

        revalidatePath("/posts");
        revalidatePath("/admin");
        return { success: true };
    } catch (error) {
        console.error("Failed to create post:", error);
        return { success: false, error: "Kunne ikke opprette innlegg." };
    }
}

export async function deletePost(postId: string) {
    const member = await ensureMember();
    if (!member || member.role !== "ADMIN") {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await prisma.post.delete({
            where: { id: postId },
        });

        revalidatePath("/posts");
        revalidatePath("/admin");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete post:", error);
        return { success: false, error: "Kunne ikke slette innlegg" };
    }
}

export async function updatePost(postId: string, data: {
    title: string;
    content: string;
    category: PostCategory;
}) {
    const member = await ensureMember();
    if (!member || member.role !== "ADMIN") {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await prisma.post.update({
            where: { id: postId },
            data: {
                title: data.title,
                content: data.content,
                category: data.category
            }
        });

        revalidatePath("/posts");
        revalidatePath(`/posts/${postId}`);
        revalidatePath("/admin");
        return { success: true };
    } catch (error) {
        console.error("Failed to update post:", error);
        return { success: false, error: "Kunne ikke oppdatere innlegg" };
    }
}

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
