"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { useModal } from "@/components/providers/ModalContext";
import { recalculateAllBalances } from "@/server/actions/finance";
import { AdminPageHeader, SERIF } from "@/components/admin/ui";

export default function AdminSystemClientPage() {
    const { data } = useAdminDashboard();
    const { openConfirm, openAlert } = useModal();
    const [syncing, setSyncing] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (data && data.role !== "ADMIN") {
            router.push("/admin/dashboard");
        }
    }, [data, router]);

    const handleSyncBalances = async () => {
        const confirmed = await openConfirm({
            title: "Synkroniser Saldoer",
            message: "Dette regner ut saldoen til ALLE medlemmer på nytt fra transaksjonshistorikken deres, og overskriver den lagrede saldoen.\n\n- Medlemmer uten transaksjoner settes til 0.\n- Manuelle saldojusteringer som ikke ligger som transaksjon, blir borte.\n- Det sendes ingen varsler.\n\nEr du sikker?",
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
            <AdminPageHeader
                eyebrow="Administrasjon"
                title="Systeminnstillinger"
                description="Her kan du enkelt administrere klubbens daglige drift og innhold."
            />

            {/* Section 1: Økonomi */}
            <div>
                <div className="flex items-center gap-2.5 mb-4 text-gray-900">
                    <span className="material-symbols-outlined text-xl text-primary">account_balance_wallet</span>
                    <h2 className="text-2xl font-normal text-gray-900" style={{ fontFamily: SERIF }}>Økonomi</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Sett Saldo */}
                    <Link href="/admin/system/set-balance" className="bg-white p-4 rounded-2xl border border-border-color hover:border-primary/50 hover:shadow-sm transition-all group flex items-start gap-3">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#0f0e0c] group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-xl">edit_note</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-normal text-gray-900 mb-1" style={{ fontFamily: SERIF }}>Sett Saldo</h3>
                            <p className="text-sm text-text-secondary leading-snug">
                                Sett saldo for enkeltmedlemmer.
                            </p>
                        </div>
                    </Link>

                    {/* Synkroniser Saldoer */}
                    <button
                        onClick={handleSyncBalances}
                        disabled={syncing}
                        className="bg-white p-4 rounded-2xl border border-border-color hover:border-primary/50 hover:shadow-sm transition-all text-left w-full group flex items-start gap-3 disabled:opacity-60"
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${syncing ? 'bg-amber-100 text-amber-600' : 'bg-primary/10 text-primary group-hover:bg-[#0f0e0c] group-hover:text-white'}`}>
                            {syncing ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary/30 border-t-primary" />
                            ) : (
                                <span className="material-symbols-outlined text-xl">sync_saved_locally</span>
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-normal text-gray-900 mb-1" style={{ fontFamily: SERIF }}>Synkroniser Saldoer</h3>
                            <p className="text-sm text-text-secondary leading-snug">
                                {syncing ? 'Synkroniserer...' : 'Gjenopprett og rekalkuler alle saldoer.'}
                            </p>
                        </div>
                    </button>


                    {/* Slett Fakturaer */}
                    <Link href="/admin/system/delete-invoices" className="bg-white p-4 rounded-2xl border border-border-color hover:border-primary/50 hover:shadow-sm transition-all group flex items-start gap-3">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#0f0e0c] group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-xl">remove_shopping_cart</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-normal text-gray-900 mb-1" style={{ fontFamily: SERIF }}>Slett Fakturaer</h3>
                            <p className="text-sm text-text-secondary leading-snug">
                                Bulk-sletting av ubetalte fakturaer.
                            </p>
                        </div>
                    </Link>

                    {/* Slett Transaksjoner */}
                    <Link href="/admin/system/delete-transactions" className="bg-white p-4 rounded-2xl border border-border-color hover:border-primary/50 hover:shadow-sm transition-all group flex items-start gap-3">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#0f0e0c] group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-xl">delete_forever</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-normal text-gray-900 mb-1" style={{ fontFamily: SERIF }}>Slett Transaksjoner</h3>
                            <p className="text-sm text-text-secondary leading-snug">
                                Slett feilførte transaksjoner.
                            </p>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Section 2: Medlemspleie */}
            <div>
                <div className="flex items-center gap-2.5 mb-4 text-gray-900">
                    <span className="material-symbols-outlined text-xl text-primary">favorite_border</span>
                    <h2 className="text-2xl font-normal text-gray-900" style={{ fontFamily: SERIF }}>Medlemspleie</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Brukerroller */}
                    <Link href="/admin/system/user-roles" className="bg-white p-4 rounded-2xl border border-border-color hover:border-primary/50 hover:shadow-sm transition-all group flex items-start gap-3">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#0f0e0c] group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-xl">security</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-normal text-gray-900 mb-1" style={{ fontFamily: SERIF }}>Brukerroller</h3>
                            <p className="text-sm text-text-secondary leading-snug">
                                Administrer roller og rettigheter.
                            </p>
                        </div>
                    </Link>
                    {/* Slett Bruker */}
                    <Link href="/admin/system/delete" className="bg-white p-4 rounded-2xl border border-border-color hover:border-primary/50 hover:shadow-sm transition-all group flex items-start gap-3">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#0f0e0c] group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-xl">person_remove</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-normal text-gray-900 mb-1" style={{ fontFamily: SERIF }}>Slett Bruker</h3>
                            <p className="text-sm text-text-secondary leading-snug">
                                Fjern medlem permanent.
                            </p>
                        </div>
                    </Link>

                    {/* Medlemstyper */}
                    <Link href="/admin/system/membership-types" className="bg-white p-4 rounded-2xl border border-border-color hover:border-primary/50 hover:shadow-sm transition-all group flex items-start gap-3">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#0f0e0c] group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-xl">loyalty</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-normal text-gray-900 mb-1" style={{ fontFamily: SERIF }}>Medlemstyper</h3>
                            <p className="text-sm text-text-secondary leading-snug">
                                Medlemskapstyper og kontingenter
                            </p>
                        </div>
                    </Link>

                    {/* Event Participation */}
                    <Link href="/admin/system/event-participation" className="bg-white p-4 rounded-2xl border border-border-color hover:border-primary/50 hover:shadow-sm transition-all group flex items-start gap-3">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#0f0e0c] group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-xl">event_available</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-normal text-gray-900 mb-1" style={{ fontFamily: SERIF }}>Påmeldinger</h3>
                            <p className="text-sm text-text-secondary leading-snug">
                                Administrer påmeldinger manuelt.
                            </p>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Section 3: Innholdsstyring */}
            <div>
                <div className="flex items-center gap-2.5 mb-4 text-gray-900">
                    <span className="material-symbols-outlined text-xl text-primary">menu_book</span>
                    <h2 className="text-2xl font-normal text-gray-900" style={{ fontFamily: SERIF }}>Innholdsstyring</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Administrer kategorier */}
                    <Link href="/admin/system/categories" className="bg-white p-4 rounded-2xl border border-border-color hover:border-primary/50 hover:shadow-sm transition-all group flex items-start gap-3">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#0f0e0c] group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-xl">category</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-normal text-gray-900 mb-1" style={{ fontFamily: SERIF }}>Innlegg kategorier</h3>
                            <p className="text-sm text-text-secondary leading-snug">
                                Administrer innlegg kategorier.
                            </p>
                        </div>
                    </Link>

                    {/* Administrer arrangementskategorier */}
                    <Link href="/admin/system/event-categories" className="bg-white p-4 rounded-2xl border border-border-color hover:border-primary/50 hover:shadow-sm transition-all group flex items-start gap-3">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#0f0e0c] group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-xl">event_upcoming</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-normal text-gray-900 mb-1" style={{ fontFamily: SERIF }}>Arrangementer kategorier</h3>
                            <p className="text-sm text-text-secondary leading-snug">
                                Administrer kategorier for arrangementer.
                            </p>
                        </div>
                    </Link>

                    {/* Bildeinnstillinger */}
                    <Link href="/admin/system/photos" className="bg-white p-4 rounded-2xl border border-border-color hover:border-primary/50 hover:shadow-sm transition-all group flex items-start gap-3">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#0f0e0c] group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-xl">image</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-normal text-gray-900 mb-1" style={{ fontFamily: SERIF }}>Bildeinnstillinger</h3>
                            <p className="text-sm text-text-secondary leading-snug">
                                Opplastingsgrenser og bildearkiv.
                            </p>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Section 4: Systemstatus */}
            <div>
                <div className="flex items-center gap-2.5 mb-4 text-gray-900">
                    <span className="material-symbols-outlined text-xl text-primary">monitoring</span>
                    <h2 className="text-2xl font-normal text-gray-900" style={{ fontFamily: SERIF }}>Systemstatus</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Resource Manager */}
                    <Link href="/admin/system/resource-manager" className="bg-white p-4 rounded-2xl border border-border-color hover:border-primary/50 hover:shadow-sm transition-all group flex items-start gap-3">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#0f0e0c] group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-xl">memory</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-normal text-gray-900 mb-1" style={{ fontFamily: SERIF }}>Resource Manager</h3>
                            <p className="text-sm text-text-secondary leading-snug">
                                Systemressurser og lagring.
                            </p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
