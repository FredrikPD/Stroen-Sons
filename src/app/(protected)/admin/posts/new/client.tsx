"use client";

import { createPost } from "@/server/actions/posts";
import { useRouter } from "next/navigation";
import { PostForm } from "@/components/posts/PostForm";

interface NewPostClientPageProps {
    categories?: { id: string; name: string }[];
}

export default function NewPostClientPage({ categories }: NewPostClientPageProps) {
    const router = useRouter();

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
            <div className="w-full">
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden relative">
                    {/* Decorative Top Bar */}
                    <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                    <div className="p-8">
                        <PostForm
                            submitButtonText="Publiser Innlegg"
                            pageTitle="Nytt Innlegg"
                            pageDescription="Publiser nyheter eller beskjeder til tavlen."
                            onSubmit={async (data) => {
                                return await createPost(data);
                            }}
                            redirectOnSuccess="/admin/posts"
                            categories={categories}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
