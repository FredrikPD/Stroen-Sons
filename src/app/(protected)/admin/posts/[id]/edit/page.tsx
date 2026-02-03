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

export default async function EditPostPage({ params }: EditPostPageProps) {
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
        const result = await updatePost(id, data);
        if (result.success) {
            redirect("/admin/posts");
        }
        return result;
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

    return (
        <div className="space-y-8 pb-12">
            <PostForm
                initialData={initialData}
                onSubmit={handleSubmit}
                submitButtonText="Lagre Endringer"
                isEditMode
                pageTitle="Rediger Innlegg"
                pageDescription="Endre informasjonen for dette innlegget."
            />
        </div>
    );
}
