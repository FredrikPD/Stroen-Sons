"use client";

import { setMonthlyFeePausePreference } from "@/server/actions/finance";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

interface MonthlyFeePauseCardProps {
    initialEnabled: boolean;
    balance: number;
    cap: number;
    className?: string;
    mode?: "card" | "embedded";
}

export function MonthlyFeePauseCard({
    initialEnabled,
    balance,
    cap,
    className = "",
    mode = "card"
}: MonthlyFeePauseCardProps) {
    const router = useRouter();
    const [enabled, setEnabled] = useState(initialEnabled);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const eligible = useMemo(() => balance > cap, [balance, cap]);

    useEffect(() => {
        setEnabled(initialEnabled);
    }, [initialEnabled]);

    useEffect(() => {
        if (!eligible) {
            setEnabled(false);
        }
    }, [eligible]);

    const handleToggle = () => {
        if (!eligible || isPending) return;

        const nextEnabled = !enabled;
        setError(null);

        startTransition(async () => {
            const result = await setMonthlyFeePausePreference(nextEnabled);

            if (result.success) {
                setEnabled(typeof result.enabled === "boolean" ? result.enabled : nextEnabled);
            } else {
                setEnabled(false);
                setError(result.error ?? "Kunne ikke oppdatere innstillingen.");
            }

            router.refresh();
        });
    };

    const content = (
        <>
            <div className="relative z-10">
                <h3 className="font-bold text-sm mb-4">Aktiver saldo grense</h3>
            </div>

            <button
                type="button"
                onClick={handleToggle}
                disabled={!eligible || isPending}
                aria-pressed={enabled}
                className={`relative z-10 w-full rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-sm font-semibold border transition-colors ${enabled
                    ? "bg-emerald-500/25 border-emerald-300/40 text-emerald-100"
                    : "bg-white/10 border-white/20 text-white/85"
                    } ${eligible && !isPending && !enabled ? "hover:bg-white/15" : ""} ${(!eligible || isPending) ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
            >
                <span className="flex items-center gap-2 min-w-0">
                    {isPending ? (
                        <span className="h-5 w-5 shrink-0 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    ) : enabled ? (
                        <span className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 bg-emerald-100/20 text-emerald-100">
                            <span className="material-symbols-outlined text-[0.95rem] leading-none">check</span>
                        </span>
                    ) : null}
                    <span className="leading-tight truncate">Stopp medlemskontigent</span>
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border shrink-0 ${enabled
                    ? "bg-emerald-100/20 border-emerald-300/40 text-emerald-100"
                    : "bg-white/10 border-white/20 text-white/70"
                    }`}>
                    {enabled ? "Aktivert" : "Ikke aktivert"}
                </span>
            </button>

            <p className="relative z-10 mt-4 text-xs text-white/60 italic flex items-center gap-2 leading-relaxed">
                <span className="material-symbols-outlined text-base leading-none shrink-0">lock</span>
                <span>
                    Funksjonen kan kun aktiveres hvis saldoen din overstiger <span className="font-semibold">4 500 NOK</span>. Den tilbakestilles automatisk når saldoen faller under dette nivået.
                </span>
            </p>

            {error && (
                <p className="relative z-10 mt-2 text-xs text-rose-300">
                    {error}
                </p>
            )}
        </>
    );

    if (mode === "embedded") {
        return (
            <div className={`relative z-10 ${className}`}>
                {content}
            </div>
        );
    }

    return (
        <div className={`bg-[#0F172A] text-white p-6 rounded-xl shadow-md flex flex-col justify-between min-h-[180px] lg:min-h-0 relative overflow-hidden ${className}`}>
            <div className="absolute top-4 right-4 text-white/5 pointer-events-none">
                <span className="material-symbols-outlined text-[5rem]">pause_circle</span>
            </div>
            {content}
        </div>
    );
}
