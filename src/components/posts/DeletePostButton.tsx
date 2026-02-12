"use client";

import { deletePost } from "@/server/actions/posts";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useModal } from "@/components/providers/ModalContext";

export default function DeletePostButton({ postId }: { postId: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const { openConfirm, openAlert } = useModal();

    const handleDelete = async () => {
        const confirmed = await openConfirm({
            title: "Slett innlegg",
            message: "Er du sikker på at du vil slette dette innlegget? Det kan ikke angres.",
            type: "error",
            confirmText: "Slett",
            cancelText: "Avbryt"
        });

        if (!confirmed) return;

        setLoading(true);
        const res = await deletePost(postId);

        if (res.success) {
            router.push("/posts");
            router.refresh();
        } else {
            await openAlert({
                title: "Feil",
                message: res.error || "Noe gikk galt",
                type: "error"
            });
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100 disabled:opacity-50"
        >
            {loading ? (
                <div className="animate-spin h-3 w-3 border-2 border-[#4F46E5]/25 border-t-[#4F46E5] rounded-full" />
            ) : (
                <span className="material-symbols-outlined text-[1.1rem]">delete</span>
            )}
            Slett
        </button>
    );
}
