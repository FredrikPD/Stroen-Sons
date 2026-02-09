import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { updatePost } from "@/server/actions/posts";
import { PostForm } from "@/components/posts/PostForm";
import { PostInput } from "@/lib/validators/posts";

interface EditPostPageProps {
    params: Promise<{
        id: string;
    }>;
}

import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import { Metadata } from "next";

export async function generateMetadata({ params }: EditPostPageProps): Promise<Metadata> {
    const { id } = await params;
    const post = await prisma.post.findUnique({
        where: { id },
        select: { title: true }
    });

    return {
        title: post ? `Rediger: ${post.title}` : "Rediger Innlegg",
    };
}

export default async function EditPostPage({ params }: EditPostPageProps) {
    await ensureRole([Role.ADMIN, Role.MODERATOR]);
    const { id } = await params;
    const post = await prisma.post.findUnique({
        where: { id },
        include: { attachments: true },
    });

    if (!post) {
        notFound();
    }

    const handleSubmit = async (data: PostInput) => {
        "use server";
        return await updatePost(id, data);
    };

    // Prepare initial data
    const initialData: Partial<PostInput> = {
        title: post.title,
        content: post.content,
        category: post.category,
        eventId: post.eventId || undefined,
        attachments: post.attachments.map(att => ({
            url: att.url,
            name: att.name,
            size: att.size,
            type: att.type,
        })),
    };

    const categories = await prisma.category.findMany({
        orderBy: { name: "asc" }
    });

    return (
        <div className="space-y-8 pb-12">
            <PostForm
                initialData={initialData}
                onSubmit={handleSubmit}
                submitButtonText="Lagre Endringer"
                isEditMode
                pageTitle="Rediger Innlegg"
                pageDescription="Endre informasjonen for dette innlegget."
                redirectOnSuccess="/admin/posts"
                categories={categories}
            />
        </div>
    );
}
