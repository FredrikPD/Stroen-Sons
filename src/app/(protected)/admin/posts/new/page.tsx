"use client";

import { createPost } from "@/server/actions/posts";
import { useRouter } from "next/navigation";
import { PostForm } from "@/components/posts/PostForm";

export default function NewPostPage() {
    const router = useRouter();

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
            <div className="w-full">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Nytt Innlegg</h1>
                    <p className="text-gray-500 mt-2">Publiser nyheter eller beskjeder til tavlen.</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden relative">
                    {/* Decorative Top Bar */}
                    <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                    <div className="p-8">
                        <PostForm
                            submitButtonText="Publiser Innlegg"
                            onSubmit={async (data) => {
                                const res = await createPost(data);
                                if (res.success) {
                                    setTimeout(() => router.push("/admin/posts"), 1000);
                                }
                                return res;
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
