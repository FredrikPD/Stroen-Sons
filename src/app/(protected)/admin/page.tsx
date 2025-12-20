"use client";

import Link from "next/link";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";

export default function AdminDashboardPage() {
    const { data, loading } = useAdminDashboard();

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

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
            </div>

            {/* Quick Actions Section */}
            <div>
                <h2 className="text-lg font-bold text-text-main mb-4">Hurtighandlinger</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                    {/* New Event */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between min-h-[180px] group hover:border-[#4F46E5]/50 transition-colors shadow-sm hover:shadow-md">
                        <div className="mb-4">
                            <div className="w-8 h-8 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center text-[#4F46E5] mb-3 group-hover:bg-[#4F46E5] group-hover:text-white transition-all">
                                <span className="material-symbols-outlined text-lg">calendar_add_on</span>
                            </div>
                            <h3 className="text-base font-bold text-gray-900 mb-1">Nytt Arrangement</h3>
                            <p className="text-gray-500 text-xs leading-relaxed">Opprett et nytt arrangement for klubben.</p>
                        </div>
                        <button className="w-full py-2.5 bg-[#4F46E5] hover:bg-[#4338ca] text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5">
                            <span className="material-symbols-outlined text-base">add</span>
                            Opprett Arrangement
                        </button>
                    </div>

                    {/* New Post */}
                    <Link href="/admin/posts/new" className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between min-h-[180px] group hover:border-[#4F46E5]/50 transition-colors shadow-sm hover:shadow-md">
                        <div className="mb-4">
                            <div className="w-8 h-8 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center text-[#4F46E5] mb-3 group-hover:bg-[#4F46E5] group-hover:text-white transition-all">
                                <span className="material-symbols-outlined text-lg">post_add</span>
                            </div>
                            <h3 className="text-base font-bold text-gray-900 mb-1">Nytt Innlegg</h3>
                            <p className="text-gray-500 text-xs leading-relaxed">Publiser nyheter eller beskjeder til tavlen.</p>
                        </div>
                        <div className="w-full py-2.5 bg-[#4F46E5] hover:bg-[#4338ca] text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5">
                            <span className="material-symbols-outlined text-base">edit</span>
                            Skriv Innlegg
                        </div>
                    </Link>

                    {/* Upload Photos */}
                    <Link href="/admin/photos" className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between min-h-[180px] group hover:border-[#4F46E5]/50 transition-colors shadow-sm hover:shadow-md">
                        <div className="mb-4">
                            <div className="w-8 h-8 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center text-[#4F46E5] mb-3 group-hover:bg-[#4F46E5] group-hover:text-white transition-all">
                                <span className="material-symbols-outlined text-lg">cloud_upload</span>
                            </div>
                            <h3 className="text-base font-bold text-gray-900 mb-1">Administrer Bilder</h3>
                            <p className="text-gray-500 text-xs leading-relaxed">Last opp eller slett bilder fra arkivet.</p>
                        </div>
                        <div className="w-full py-2.5 bg-[#4F46E5] hover:bg-[#4338ca] text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5">
                            <span className="material-symbols-outlined text-base">settings_photo_camera</span>
                            Administrer
                        </div>
                    </Link>

                    {/* User Management Shortcut */}
                    <Link href="/admin/users" className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between min-h-[180px] group hover:border-[#1A56DB]/50 transition-colors shadow-sm hover:shadow-md">
                        <div className="mb-4">
                            <div className="w-8 h-8 rounded-lg bg-[#1A56DB]/10 flex items-center justify-center text-[#1A56DB] mb-3 group-hover:bg-[#1A56DB] group-hover:text-white transition-all">
                                <span className="material-symbols-outlined text-lg">manage_accounts</span>
                            </div>
                            <h3 className="text-base font-bold text-gray-900 mb-1">Brukeradministrasjon</h3>
                            <p className="text-gray-500 text-xs leading-relaxed">Inviter, slett eller endre roller.</p>
                        </div>
                        <div className="w-full py-2.5 bg-[#1A56DB] hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5">
                            <span className="material-symbols-outlined text-base">arrow_forward</span>
                            Gå til Brukere
                        </div>
                    </Link>

                    {/* Finance Portal */}
                    <Link href="/admin/finance" className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between min-h-[180px] group hover:border-emerald-500/50 transition-colors shadow-sm hover:shadow-md">
                        <div className="mb-4">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-3 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                <span className="material-symbols-outlined text-lg">account_balance</span>
                            </div>
                            <h3 className="text-base font-bold text-gray-900 mb-1">Økonomi</h3>
                            <p className="text-gray-500 text-xs leading-relaxed">Oversikt over inntekter, utgifter og kontingent.</p>
                        </div>
                        <div className="w-full py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5">
                            <span className="material-symbols-outlined text-base">monitoring</span>
                            Se Økonomi
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
