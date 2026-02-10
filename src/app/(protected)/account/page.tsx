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
                <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm p-4">
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
                                    <span className="material-symbols-outlined text-sm">calendar_month</span>
                                    Medlem siden {new Date(profile.createdAt).getFullYear()}
                                </div>
                            </div>


                        </div>
                    </div>
                </div>

                {/* Role Card (Smaller) */}
                <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 text-white rounded-2xl p-4 shadow-md relative overflow-hidden group flex flex-col justify-between min-h-[100px]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <p className="text-zinc-400 text-xs uppercase tracking-wider font-bold mb-1">Din Rolle</p>
                            <h3 className="text-2xl font-bold">{profile.userRole?.name || profile.role}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                            <span className="material-symbols-outlined text-2xl">verified_user</span>
                        </div>
                    </div>

                    <div className="relative z-10 mt-2 flex items-center gap-2 text-zinc-400 text-sm">
                        <span className={`w-2 h-2 rounded-full ${isAccountActive ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                        {isAccountActive ? 'Kontoen er aktiv' : 'Kontoen er inaktiv'}
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
