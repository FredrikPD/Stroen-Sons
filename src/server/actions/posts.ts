"use server";

import { prisma } from "@/server/db";
import { ensureMember } from "@/server/auth/ensureMember";
import type { PostWithDetails } from "@/components/posts/PostItem";
import { revalidatePath } from "next/cache";
import { PostCategory } from "@prisma/client";
import { broadcastNotification } from "@/server/actions/notifications";
import { sendPostNotification } from "@/server/actions/emails";

export type GetPostsParams = {
    cursor?: string;
    limit?: number;
    search?: string;
    sort?: "newest" | "oldest";
    category?: string;
};

import { postSchema, PostInput } from "@/lib/validators/posts";

export async function createPost(data: PostInput) {
    const member = await ensureMember();
    if (!member || (member.role !== "ADMIN" && member.role !== "MODERATOR")) {
        return { success: false, error: "Du har ikke tilgang til å opprette innlegg." };
    }

    const validatedFields = postSchema.safeParse(data);
    if (!validatedFields.success) {
        console.error("Validation error:", validatedFields.error);
        return { success: false, error: "Ugyldig data. Vennligst sjekk feltene." };
    }

    try {
        const post = await prisma.post.create({
            data: {
                title: data.title,
                content: data.content,
                category: data.category,
                authorId: member.id,
                eventId: data.eventId || undefined,
                attachments: {
                    create: data.attachments?.map((att) => ({
                        url: att.url,
                        name: att.name,
                        size: att.size,
                        type: att.type || "unknown",
                    }))
                }
            },
        });


        // Notify all members
        await broadcastNotification({
            type: "POST_CREATED",
            title: "Nytt innlegg",
            message: `"${data.title}" har blitt publisert.`,
            link: `/posts/${post.id}`,
        });

        if (data.sendNotification) {
            await sendPostNotification({
                postTitle: data.title,
                postContent: data.content,
                authorName: `${member.firstName} ${member.lastName}`,
                postId: post.id,
                category: data.category
            });
        }

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

export async function updatePost(postId: string, data: PostInput) {
    const member = await ensureMember();
    if (!member || member.role !== "ADMIN") {
        return { success: false, error: "Unauthorized" };
    }

    const validatedFields = postSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, error: "Invalid data" };
    }

    try {
        // Transaction to handle attachments update safely? 
        // Or just update. For attachments, simplest is often deleteMany + createMany or create.
        // Prisma doesn't support createMany inside update nested relations easily for sqlite (if limited) but postgres is fine.
        // Let's use deleteMany then create.

        await prisma.post.update({
            where: { id: postId },
            data: {
                title: data.title,
                content: data.content,
                category: data.category,
                eventId: data.eventId ?? null,
                attachments: {
                    deleteMany: {},
                    create: data.attachments?.map((att) => ({
                        url: att.url,
                        name: att.name,
                        size: att.size,
                        type: att.type || "unknown",
                    }))
                }
            }
        });

        revalidatePath("/posts");
        revalidatePath(`/posts/${postId}`);
        revalidatePath("/admin");
        revalidatePath("/admin/posts");
        revalidatePath("/admin/posts");

        if (data.sendNotification) {
            await broadcastNotification({
                type: "POST_UPDATED",
                title: "Innlegg oppdatert",
                message: `"${data.title}" har blitt oppdatert.`,
                link: `/posts/${postId}`,
            });
        }

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
            attachments: true,
        },
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
}

export async function togglePinPost(postId: string) {
    const member = await ensureMember();
    if (!member || member.role !== "ADMIN") {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const post = await prisma.post.findUnique({ where: { id: postId } });
        if (!post) return { success: false, error: "Post not found" };

        await prisma.post.update({
            where: { id: postId },
            data: { isPinned: !post.isPinned },
        });

        revalidatePath("/posts");
        return { success: true };
    } catch (error) {
        console.error("Failed to toggle pin:", error);
        return { success: false, error: "Failed to toggle pin" };
    }
}

export async function getPinnedPosts() {
    // Public access? Or member? Assuming member
    const member = await ensureMember();
    if (!member) return [];

    try {
        const posts = await prisma.post.findMany({
            where: { isPinned: true },
            orderBy: { createdAt: "desc" },
            include: {
                author: {
                    select: {
                        firstName: true,
                        lastName: true,
                    }
                }
            },
            take: 5 // Limit to 5 pinned posts in sidebar?
        });
        return posts;
    } catch (error) {
        console.error("Failed to get pinned posts:", error);
        return [];
    }
}
