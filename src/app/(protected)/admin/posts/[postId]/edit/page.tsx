import { prisma } from "@/server/db";
import { notFound, redirect } from "next/navigation";
import { updatePost } from "@/server/actions/posts";
import PostForm from "@/components/posts/PostForm";
import { ensureMember } from "@/server/auth/ensureMember";

interface EditPostPageProps {
    params: Promise<{ postId: string }>;
}

export default async function EditPostPage({ params }: EditPostPageProps) {
    const { postId } = await params;
    const member = await ensureMember();

    if (!member || member.role !== "ADMIN") {
        redirect("/");
    }

    const post = await prisma.post.findUnique({
        where: { id: postId },
    });

    if (!post) {
        notFound();
    }

    const handleSubmit = async (data: any) => {
        "use server";
        const res = await updatePost(postId, data);
        if (res.success) {
            redirect(`/posts/${postId}`);
        }
        return res;
    };

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
            <div className="w-full">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Rediger Innlegg</h1>
                    <p className="text-gray-500 mt-2">Oppdater innholdet i innlegget.</p>
                </div>

                <PostForm
                    initialData={{
                        title: post.title,
                        content: post.content,
                        category: post.category
                    }}
                    onSubmit={handleSubmit}
                    submitLabel="Lagre Endringer"
                    loadingLabel="Lagrer..."
                    cancelHref={`/posts/${postId}`}
                />
            </div>
        </div>
    );
}
