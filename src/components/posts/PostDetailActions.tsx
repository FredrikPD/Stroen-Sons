"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { togglePinPost } from "@/server/actions/posts";

/** Admin-only pin toggle shown in the detail-page action bar. Stays
    outlined in both states (matching the mockup); the label reflects state. */
export function PinToggleButton({ postId, isPinned }: { postId: string; isPinned: boolean }) {
    const router = useRouter();
    const [pinned, setPinned] = useState(isPinned);
    const [pending, setPending] = useState(false);

    const onClick = async () => {
        setPending(true);
        const next = !pinned;
        setPinned(next); // optimistic
        const res = await togglePinPost(postId);
        setPending(false);
        if (res?.success) {
            toast.success(next ? "Innlegget ble festet" : "Innlegget ble løsnet");
            router.refresh();
        } else {
            setPinned(!next); // revert
            toast.error(res?.error || "Noe gikk galt");
        }
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={pending}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-[12px] font-bold hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-60"
        >
            <span className={`material-symbols-outlined text-[16px] ${pinned ? "text-gray-900" : "text-gray-400"}`}>
                push_pin
            </span>
            {pinned ? "Festet" : "Fest"}
        </button>
    );
}

/** Share / copy-link button for the author row. Uses the native share sheet
    when available, otherwise copies the URL to the clipboard. */
export function ShareButton({ title }: { title: string }) {
    const onClick = async () => {
        const url = typeof window !== "undefined" ? window.location.href : "";
        try {
            if (typeof navigator !== "undefined" && navigator.share) {
                await navigator.share({ title, url });
            } else {
                await navigator.clipboard.writeText(url);
                toast.success("Lenke kopiert");
            }
        } catch {
            // user dismissed the share sheet — ignore
        }
    };

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label="Del innlegg"
            className="w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors flex items-center justify-center"
        >
            <span className="material-symbols-outlined text-[18px]">share</span>
        </button>
    );
}
