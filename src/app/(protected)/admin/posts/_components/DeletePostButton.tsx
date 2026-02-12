"use client";

import { useState, useTransition } from "react";
import { deletePost } from "@/server/actions/posts";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useModal } from "@/components/providers/ModalContext";

interface DeletePostButtonProps {
    id: string;
    title: string;
}

export function DeletePostButton({ id, title }: DeletePostButtonProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();
    const { openConfirm, openAlert } = useModal();

    const handleDelete = async () => {
        const confirmed = await openConfirm({
            title: "Slett innlegg",
            message: `Er du sikker på at du vil slette "${title}"? Dette kan ikke angres.`,
            type: "error",
            confirmText: "Slett",
            cancelText: "Avbryt"
        });

        if (!confirmed) return;

        setIsDeleting(true);
        try {
            const result = await deletePost(id);
            if (result.success) {
                toast.success("Innlegget ble slettet");
                router.refresh();
            } else {
                await openAlert({
                    title: "Feil",
                    message: result.error || "Kunne ikke slette innlegget",
                    type: "error"
                });
            }
        } catch (error) {
            await openAlert({
                title: "Feil",
                message: "En feil oppstod",
                type: "error"
            });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <button
            onClick={handleDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Slett"
            disabled={isDeleting}
        >
            {isDeleting ? (
                <span className="w-5 h-5 block border-2 border-[#4F46E5]/25 border-t-[#4F46E5] rounded-full animate-spin" />
            ) : (
                <span className="material-symbols-outlined text-[20px]">delete</span>
            )}
        </button>
    );
}
