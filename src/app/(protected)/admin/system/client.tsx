"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { useModal } from "@/components/providers/ModalContext";
import { recalculateAllBalances } from "@/server/actions/finance";

export default function AdminSystemClientPage() {
    const { data } = useAdminDashboard();
    const { openConfirm, openAlert } = useModal();
    const [syncing, setSyncing] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (data && data.role !== "ADMIN") {
            router.push("/admin");
        }
    }, [data, router]);

    const handleSyncBalances = async () => {
        const confirmed = await openConfirm({
            title: "Synkroniser Saldoer",
            message: "Dette vil rekalkulere saldoen for ALLE medlemmer basert på deres transaksjonshistorikk. Er du sikker?",
            type: "warning",
            confirmText: "Ja, synkroniser"
        });

        if (!confirmed) return;

        setSyncing(true);
        try {
            const res = await recalculateAllBalances();
            if (res.success) {
                await openAlert({
                    title: "Suksess",
                    message: `Oppdaterte saldoen for ${res.count} medlemmer.`,
                    type: "success"
                });
            } else {
                await openAlert({
                    title: "Feil",
                    message: res.error || "Ukjent feil",
                    type: "error"
                });
            }
        } catch (error) {
            await openAlert({
                title: "Feil",
                message: "Noe gikk galt.",
                type: "error"
            });
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="space-y-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Systeminnstillinger</h1>
                <p className="text-gray-500 text-sm">Her kan du enkelt administrere klubbens daglige drift og innhold.</p>
            </div>

            {/* Section 1: Økonomi */}
            <div>
                <div className="flex items-center gap-2 mb-4 text-[#1A56DB]">
                    <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
                    <h2 className="text-lg font-bold text-gray-900">Økonomi</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Sett Saldo */}
                    <Link href="/admin/finance/set-balance" className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group flex items-start gap-4">
                        <div className="w-12 h-12 bg-fuchsia-50 text-fuchsia-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-fuchsia-600 group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-xl">edit_note</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 mb-1">Sett Saldo</h3>
                            <p className="text-sm text-gray-500 leading-snug">
                                Manuell justering av saldo for enkeltmedlemmer.
                            </p>
                        </div>
                    </Link>

                    {/* Synkroniser Saldoer */}
                    <button
                        onClick={handleSyncBalances}
                        disabled={syncing}
                        className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow text-left w-full group flex items-start gap-4"
                    >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${syncing ? 'bg-amber-100 text-amber-600' : 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white'}`}>
                            {syncing ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-amber-600 border-t-transparent" />
                            ) : (
                                <span className="material-symbols-outlined text-xl">sync_saved_locally</span>
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 mb-1">Synkroniser Saldoer</h3>
                            <p className="text-sm text-gray-500 leading-snug">
                                {syncing ? 'Synkroniserer...' : 'Gjenopprett og rekalkuler alle saldoer.'}
                            </p>
                        </div>
                    </button>

                    {/* Slett Transaksjoner */}
                    <Link href="/admin/finance/delete" className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group flex items-start gap-4">
                        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-xl">delete_forever</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 mb-1">Slett Transaksjoner</h3>
                            <p className="text-sm text-gray-500 leading-snug">
                                Slett eller nullstill transaksjoner permanent.
                            </p>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Section 2: Medlemspleie */}
            <div>
                <div className="flex items-center gap-2 mb-4 text-[#1A56DB]">
                    <span className="material-symbols-outlined text-xl">favorite_border</span>
                    <h2 className="text-lg font-bold text-gray-900">Medlemspleie</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Håndter invitasjoner */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow opacity-60 flex items-start gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 text-gray-700">
                            <span className="material-symbols-outlined text-xl">send</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 mb-1">Håndter invitasjoner</h3>
                            <p className="text-sm text-gray-500 leading-snug">
                                Send ut og administrer nye invitasjoner. (Kommer snart)
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 3: Innholdsstyring */}
            <div>
                <div className="flex items-center gap-2 mb-4 text-[#1A56DB]">
                    <span className="material-symbols-outlined text-xl">menu_book</span>
                    <h2 className="text-lg font-bold text-gray-900">Innholdsstyring</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Administrer kategorier (Static) */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow opacity-60 flex items-start gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 text-gray-700">
                            <span className="material-symbols-outlined text-xl">category</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 mb-1">Administrer kategorier</h3>
                            <p className="text-sm text-gray-500 leading-snug">
                                Organiser bildegallerier. (Kommer snart)
                            </p>
                        </div>
                    </div>

                    {/* Oppdater velkomsttekst (Static) */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow opacity-60 flex items-start gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 text-gray-700">
                            <span className="material-symbols-outlined text-xl">edit_note</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 mb-1">Oppdater velkomsttekst</h3>
                            <p className="text-sm text-gray-500 leading-snug">
                                Endre velkomstteksten. (Kommer snart)
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 4: Systemstatus */}
            <div>
                <div className="flex items-center gap-2 mb-4 text-[#1A56DB]">
                    <span className="material-symbols-outlined text-xl">monitoring</span>
                    <h2 className="text-lg font-bold text-gray-900">Systemstatus</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Resource Manager */}
                    <Link href="/admin/system/resource-manager" className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-xl">memory</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 mb-1">Resource Manager</h3>
                            <p className="text-sm text-gray-500 leading-snug">
                                Oversikt over systemressurser og lagring.
                            </p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
