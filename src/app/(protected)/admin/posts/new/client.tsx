"use client";

import { createPost } from "@/server/actions/posts";
import { PostForm } from "@/components/posts/PostForm";

interface NewPostClientPageProps {
    categories?: { id: string; name: string }[];
}

export default function NewPostClientPage({ categories }: NewPostClientPageProps) {
    return (
        <div className="pb-12">
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
    );
}
