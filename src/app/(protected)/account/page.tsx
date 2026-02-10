import { getProfile } from "@/server/actions/account";
import { getMemberPaymentRequests } from "@/server/actions/payment-requests";
import { Metadata } from "next";
import AccountClient from "./AccountClient";

export const metadata: Metadata = {
    title: "Min Konto",
    description: "Administrer din konto og dine innstillinger",
};

import { ensureMember } from "@/server/auth/ensureMember";
import { redirect } from "next/navigation";

export default async function AccountPage() {
    try {
        await ensureMember();
    } catch (e) {
        redirect("/sign-in");
    }

    const { data: profile, success } = await getProfile();

    if (!success || !profile) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-3xl text-red-500">error</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Kunne ikke laste profil</h2>
                <p className="text-gray-500 max-w-sm">
                    Vi fant ikke din brukerinformasjon. Forsøk å laste siden på nytt eller logg ut og inn igjen.
                </p>
            </div>
        );
    }

    const initials = (
        (profile.firstName?.charAt(0) || "") +
        (profile.lastName?.charAt(0) || "")
    ).toUpperCase();

    // Determine account active/inactive status using PaymentRequest
    const paymentRequestsRes = await getMemberPaymentRequests(profile.id);
    const membershipRequest = paymentRequestsRes.success && paymentRequestsRes.data
        ? paymentRequestsRes.data.find(r => r.category === "MEMBERSHIP_FEE" && r.status === "PENDING")
        : null;

    let isAccountActive = true;
    if (membershipRequest?.dueDate && new Date() > new Date(membershipRequest.dueDate)) {
        isAccountActive = false;
    }

    return (
        <div className="space-y-8">
            {/* Top Row: Profile & Role */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Card (Larger) */}
                <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm p-4 flex items-center">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-80" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-4">
                        {/* Big Avatar */}
                        <div className="min-w-16 w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-gradient-to-br from-zinc-800 to-black text-white flex items-center justify-center text-2xl lg:text-3xl font-bold shadow-lg ring-4 ring-white">
                            {initials}
                        </div>

                        <div className="flex-1 text-center md:text-left pt-2">
                            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-1">
                                {profile.firstName} {profile.lastName}
                            </h1>
                            <p className="text-gray-500 text-lg mb-2">{profile.email}</p>

                            <div className="flex gap-4 justify-center md:justify-start mb-2">
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    Medlem siden {new Date(profile.createdAt).getFullYear()}
                                </div>
                            </div>


                        </div>
                    </div>
                </div>

                {/* Member Card */}
                <div className="flex flex-col items-center justify-center relative">
                    {/* The Card */}
                    <div className="w-full h-full bg-gray-900 text-white rounded-2xl p-6 relative overflow-hidden shadow-2xl">

                        {/* Decorative Background Elements */}
                        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500 rounded-full mix-blend-overlay filter blur-3xl opacity-30" />
                        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-500 rounded-full mix-blend-overlay filter blur-3xl opacity-30" />

                        {/* Card Content */}
                        <div className="relative z-10 flex flex-col justify-between h-full">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-medium">Medlemskort</p>
                                    <h3 className="text-lg font-bold mt-1 tracking-wide">STRØEN SØNS</h3>
                                </div>
                                <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-base">verified</span>
                                </div>
                            </div>

                            <div className="space-y-4 mt-4">
                                <div className="flex justify-between items-end border-t border-white/10 pt-4">
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Rolle</p>
                                        <span className="text-sm font-semibold tracking-wide mt-1 block">
                                            {profile.userRole?.name || profile.role}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Medlemstype</p>
                                        <p className="text-sm font-semibold tracking-wide mt-1">{profile.membershipType || "Standard"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Status</p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <div className={`w-1.5 h-1.5 rounded-full ${isAccountActive ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
                                            <span className="text-sm font-semibold tracking-wide">{isAccountActive ? "Aktiv" : "Inaktiv"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Stats Cards (New Row) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Balance Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-emerald-500 text-base">account_balance_wallet</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Saldo</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">
                        {new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(Number(profile.balance))}
                    </p>
                </div>

                {/* Events Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-purple-500 text-base">event_available</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Arrangementer</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{profile._count.eventsAttending}</p>
                </div>

                {/* Posts Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-blue-500 text-base">post_add</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Innlegg</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{profile._count.posts}</p>
                </div>
            </div>

            {/* Content Form */}
            <AccountClient initialProfile={profile} />
        </div>
    );
}
