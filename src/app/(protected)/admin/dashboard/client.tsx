"use client";

import Link from "next/link";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";

export default function AdminDashboardClientPage() {
    const { data, loading, error } = useAdminDashboard();

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Tilgang Nektet</h1>
                <p className="text-gray-600 mb-4">{error}</p>
                <Link href="/dashboard" className="text-blue-600 underline">Gå til min side</Link>
            </div>
        );
    }

    const hasAccess = (path: string) => {
        if (!data) return false;
        if (data.role === "ADMIN") return true;

        // Legacy moderator check
        if (data.role === "MODERATOR") {
            const allowed = ["/admin", "/admin/events", "/admin/posts", "/admin/photos"];
            return allowed.includes(path);
        }

        // Dynamic userRole check
        if (data.userRole?.allowedPaths && data.userRole.allowedPaths.length > 0) {
            return data.userRole.allowedPaths.some((pattern: string) => {
                try {
                    return new RegExp(`^${pattern}$`).test(path);
                } catch (e) { return false; }
            });
        }

        return false;
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-text-main mb-1">Velkommen, {data?.firstName ?? "Administrator"}</h1>
                <p className="text-text-secondary text-sm">Her er en oversikt over klubbens status og dine administrative verktøy.</p>
            </div>

            {/* Stats Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Members Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between h-[140px] relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-indigo-500 text-lg">person</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Medlemmer</span>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-gray-900">{data?.memberCount ?? 0}</p>
                    </div>
                    <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-10 transition-opacity">
                        <span className="material-symbols-outlined text-7xl text-indigo-500">groups</span>
                    </div>
                </div>

                {/* Next Event Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between h-[140px] relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-purple-500 text-lg">calendar_month</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Neste Event</span>
                    </div>
                    <div>
                        <p className="text-lg font-bold text-gray-900 mb-0.5 truncate">{data?.nextEvent ? data.nextEvent.title : "Ingen planlagt event"}</p>
                        <p className="text-gray-500 text-xs">
                            {data?.nextEvent ? new Date(data.nextEvent.startAt).toLocaleDateString("nb-NO", { day: 'numeric', month: 'short' }) : "—"}
                        </p>
                    </div>
                    <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-10 transition-opacity">
                        <span className="material-symbols-outlined text-7xl text-purple-500">event</span>
                    </div>
                </div>

                {/* Treasury Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between h-[140px] relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-emerald-500 text-lg">account_balance_wallet</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Kassebeholdning</span>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-gray-900">
                            {new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(data?.treasuryBalance ?? 0)}
                        </p>
                    </div>
                    <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-10 transition-opacity">
                        <span className="material-symbols-outlined text-7xl text-emerald-500">payments</span>
                    </div>
                </div>

                {/* Unpaid Fees Card */}
                {data?.unpaidCount === -1 ? (
                    // Case: No Invoices Generated
                    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between h-[140px] relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-500/5 to-transparent pointer-events-none" />
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-gray-400 text-lg">receipt_long</span>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Faktura ({new Date().toLocaleString('nb-NO', { month: 'long' })})</span>
                        </div>
                        <div>
                            <p className="text-xl font-bold text-gray-900">Ingen faktura</p>
                            <p className="text-xs text-gray-500 mt-1">Ikke generert enda</p>
                        </div>
                        <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-10 transition-opacity">
                            <span className="material-symbols-outlined text-7xl text-gray-400">receipt_long</span>
                        </div>
                    </div>
                ) : (data?.unpaidCount ?? 0) === 0 ? (
                    // Case: All Paid
                    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between h-[140px] relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ubetalt ({new Date().toLocaleString('nb-NO', { month: 'long' })})</span>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-gray-900">Alle betalt</p>
                        </div>
                        <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-10 transition-opacity">
                            <span className="material-symbols-outlined text-7xl text-emerald-500">check_circle</span>
                        </div>
                    </div>
                ) : (
                    // Case: Unpaid Invoices exist
                    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between h-[140px] relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-red-500 text-lg">warning</span>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ubetalt ({new Date().toLocaleString('nb-NO', { month: 'long' })})</span>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-gray-900">{data?.unpaidCount ?? 0} stk</p>
                        </div>
                        <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-10 transition-opacity">
                            <span className="material-symbols-outlined text-7xl text-red-500">money_off</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Actions Section */}
            <div>
                <h2 className="text-lg font-bold text-text-main mb-4">Administrer</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                    {/* All Events */}
                    {hasAccess("/admin/events") ? (
                        <Link href="/admin/events" className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between min-h-[180px] group hover:border-[#4F46E5]/50 transition-colors shadow-sm hover:shadow-md">
                            <div className="mb-4">
                                <div className="w-8 h-8 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center text-[#4F46E5] mb-3 group-hover:bg-[#4F46E5] group-hover:text-white transition-all">
                                    <span className="material-symbols-outlined text-lg">calendar_month</span>
                                </div>
                                <h3 className="text-base font-bold text-gray-900 mb-1">Arrangementer</h3>
                                <p className="text-gray-500 text-xs leading-relaxed">Se oversikt og administrer alle arrangementer.</p>
                            </div>
                            <div className="w-full py-2.5 bg-[#4F46E5] hover:bg-[#4338ca] text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5">
                                <span className="material-symbols-outlined text-base">arrow_forward</span>
                                Gå til Arrangementer
                            </div>
                        </Link>
                    ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 flex flex-col justify-between min-h-[180px] opacity-60 cursor-not-allowed grayscale">
                            <div className="mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 mb-3">
                                    <span className="material-symbols-outlined text-lg">calendar_month</span>
                                </div>
                                <h3 className="text-base font-bold text-gray-500 mb-1">Arrangementer</h3>
                                <p className="text-gray-400 text-xs leading-relaxed">Se oversikt og administrer alle arrangementer.</p>
                            </div>
                            <div className="w-full py-2.5 bg-gray-200 text-gray-400 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed">
                                <span className="material-symbols-outlined text-base">lock</span>
                                Ingen tilgang
                            </div>
                        </div>
                    )}

                    {/* Posts */}
                    {hasAccess("/admin/posts") ? (
                        <Link href="/admin/posts" className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between min-h-[180px] group hover:border-[#4F46E5]/50 transition-colors shadow-sm hover:shadow-md">
                            <div className="mb-4">
                                <div className="w-8 h-8 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center text-[#4F46E5] mb-3 group-hover:bg-[#4F46E5] group-hover:text-white transition-all">
                                    <span className="material-symbols-outlined text-lg">post_add</span>
                                </div>
                                <h3 className="text-base font-bold text-gray-900 mb-1">Innlegg</h3>
                                <p className="text-gray-500 text-xs leading-relaxed">Administrer nyheter og innlegg.</p>
                            </div>
                            <div className="w-full py-2.5 bg-[#4F46E5] hover:bg-[#4338ca] text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5">
                                <span className="material-symbols-outlined text-base">arrow_forward</span>
                                Gå til Innlegg
                            </div>
                        </Link>
                    ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 flex flex-col justify-between min-h-[180px] opacity-60 cursor-not-allowed grayscale">
                            <div className="mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 mb-3">
                                    <span className="material-symbols-outlined text-lg">post_add</span>
                                </div>
                                <h3 className="text-base font-bold text-gray-500 mb-1">Innlegg</h3>
                                <p className="text-gray-400 text-xs leading-relaxed">Administrer nyheter og innlegg.</p>
                            </div>
                            <div className="w-full py-2.5 bg-gray-200 text-gray-400 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed">
                                <span className="material-symbols-outlined text-base">lock</span>
                                Ingen tilgang
                            </div>
                        </div>
                    )}

                    {/* Upload Photos */}
                    {hasAccess("/admin/photos") ? (
                        <Link href="/admin/photos" className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between min-h-[180px] group hover:border-[#4F46E5]/50 transition-colors shadow-sm hover:shadow-md">
                            <div className="mb-4">
                                <div className="w-8 h-8 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center text-[#4F46E5] mb-3 group-hover:bg-[#4F46E5] group-hover:text-white transition-all">
                                    <span className="material-symbols-outlined text-lg">cloud_upload</span>
                                </div>
                                <h3 className="text-base font-bold text-gray-900 mb-1">Bilder</h3>
                                <p className="text-gray-500 text-xs leading-relaxed">Last opp eller slett bilder fra arkivet.</p>
                            </div>
                            <div className="w-full py-2.5 bg-[#4F46E5] hover:bg-[#4338ca] text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5">
                                <span className="material-symbols-outlined text-base">arrow_forward</span>
                                Gå til Bilder
                            </div>
                        </Link>
                    ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 flex flex-col justify-between min-h-[180px] opacity-60 cursor-not-allowed grayscale">
                            <div className="mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 mb-3">
                                    <span className="material-symbols-outlined text-lg">cloud_upload</span>
                                </div>
                                <h3 className="text-base font-bold text-gray-500 mb-1">Bilder</h3>
                                <p className="text-gray-400 text-xs leading-relaxed">Last opp eller slett bilder fra arkivet.</p>
                            </div>
                            <div className="w-full py-2.5 bg-gray-200 text-gray-400 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed">
                                <span className="material-symbols-outlined text-base">lock</span>
                                Ingen tilgang
                            </div>
                        </div>
                    )}

                    {/* User Management Shortcut */}
                    {hasAccess("/admin/users") ? (
                        <Link href="/admin/users" className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between min-h-[180px] group hover:border-[#1A56DB]/50 transition-colors shadow-sm hover:shadow-md">
                            <div className="mb-4">
                                <div className="w-8 h-8 rounded-lg bg-[#1A56DB]/10 flex items-center justify-center text-[#1A56DB] mb-3 group-hover:bg-[#1A56DB] group-hover:text-white transition-all">
                                    <span className="material-symbols-outlined text-lg">manage_accounts</span>
                                </div>
                                <h3 className="text-base font-bold text-gray-900 mb-1">Brukere</h3>
                                <p className="text-gray-500 text-xs leading-relaxed">Inviter, slett eller endre roller.</p>
                            </div>
                            <div className="w-full py-2.5 bg-[#1A56DB] hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5">
                                <span className="material-symbols-outlined text-base">arrow_forward</span>
                                Gå til Brukere
                            </div>
                        </Link>
                    ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 flex flex-col justify-between min-h-[180px] opacity-60 cursor-not-allowed grayscale">
                            <div className="mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 mb-3">
                                    <span className="material-symbols-outlined text-lg">manage_accounts</span>
                                </div>
                                <h3 className="text-base font-bold text-gray-500 mb-1">Brukere</h3>
                                <p className="text-gray-400 text-xs leading-relaxed">Inviter, slett eller endre roller.</p>
                            </div>
                            <div className="w-full py-2.5 bg-gray-200 text-gray-400 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed">
                                <span className="material-symbols-outlined text-base">lock</span>
                                Ingen tilgang
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
