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
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                <Link
                    href="/admin/posts"
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                    <span className="material-symbols-outlined text-xl">arrow_back</span>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Rediger Innlegg</h1>
                    <p className="text-gray-500 text-sm">Endre informasjonen for dette innlegget.</p>
                </div>
            </div>

            <PostForm
                initialData={initialData}
                onSubmit={handleSubmit}
                submitButtonText="Lagre Endringer"
                isEditMode
            />
        </div>
    );
}
