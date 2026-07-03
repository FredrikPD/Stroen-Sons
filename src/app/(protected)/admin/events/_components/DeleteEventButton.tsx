"use client";

import { useTransition } from "react";
import { deleteEvent } from "@/server/actions/events";
import { toast } from "sonner";
import { useModal } from "@/components/providers/ModalContext";

interface DeleteEventButtonProps {
    id: string;
    title: string;
}

export function DeleteEventButton({ id, title }: DeleteEventButtonProps) {
    const [isPending, startTransition] = useTransition();
    const { openConfirm, openAlert } = useModal();

    const handleDelete = async () => {
        const confirmed = await openConfirm({
            title: "Slett arrangement",
            message: `Er du sikker på at du vil slette "${title}"? Sletting er permanent og kan ikke angres.\n\nDette skjer:\n- Program, etterrapport og bilder slettes sammen med arrangementet\n- Alle påmeldinger fjernes\n- Fakturaer og transaksjoner beholdes, men mister koblingen til arrangementet – ingen beløp endres og ingen varsler sendes`,
            type: "error",
            confirmText: "Slett",
            cancelText: "Avbryt"
        });

        if (!confirmed) return;

        startTransition(async () => {
            const result = await deleteEvent(id);
            if (result.success) {
                toast.success("Arrangement slettet");
            } else {
                await openAlert({
                    title: "Feil",
                    message: result.error || "Kunne ikke slette arrangement",
                    type: "error"
                });
            }
        });
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isPending}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            title="Slett"
            type="button"
        >
            {isPending ? (
                <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            ) : (
                <span className="material-symbols-outlined text-lg">delete</span>
            )}
        </button>
    );
}
