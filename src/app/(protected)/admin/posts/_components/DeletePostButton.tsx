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
            message: `Er du sikker på at du vil slette "${title}"? Sletting er permanent og kan ikke angres.\n\n- Innlegget forsvinner fra nyhetsfeeden for alle medlemmer\n- Vedlegg som er knyttet til innlegget slettes sammen med det\n- Det sendes ingen varsling om at innlegget er fjernet\n- Kun administratorer kan slette innlegg`,
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
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Slett"
            disabled={isDeleting}
        >
            {isDeleting ? (
                <span className="w-5 h-5 block border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            ) : (
                <span className="material-symbols-outlined text-[20px]">delete</span>
            )}
        </button>
    );
}
