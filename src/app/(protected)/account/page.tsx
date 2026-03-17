import { getProfile } from "@/server/actions/account";
import { getMemberPaymentRequests } from "@/server/actions/payment-requests";
import { Metadata } from "next";
import AccountClient from "./AccountClient";
import { ensureMember } from "@/server/auth/ensureMember";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "Min Konto",
    description: "Administrer din konto og dine innstillinger",
};

export default async function AccountPage() {
    try {
        await ensureMember();
    } catch {
        redirect("/sign-in");
    }

    const { data: profile, success } = await getProfile();

    if (!success || !profile) {
        return (
            <div className="text-center py-8 rounded-xl border border-dashed border-gray-200">
                <p className="text-xs text-gray-400 italic" style={{ fontFamily: "'Georgia', serif" }}>
                    Kunne ikke laste inn profil.
                </p>
            </div>
        );
    }

const paymentRequestsRes = await getMemberPaymentRequests(profile.id);
    const membershipRequest = paymentRequestsRes.success && paymentRequestsRes.data
        ? paymentRequestsRes.data.find(r => r.category === "MEMBERSHIP_FEE" && r.status === "PENDING")
        : null;

    const isAccountActive = !(membershipRequest?.dueDate && new Date() > new Date(membershipRequest.dueDate));

    const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.email;

    return (
        <div className="flex flex-col gap-8 min-w-0 overflow-x-hidden">

            {/* ── Page Header ─────────────────────────────────────────── */}
            <div className="flex items-end justify-between gap-4 pt-1">
                <div>
                    <h1
                        className="text-3xl sm:text-4xl font-normal text-gray-900 leading-none"
                        style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                    >
                        <em>Min konto</em>
                    </h1>
                </div>
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest shrink-0 hidden sm:block">
                    Siden {new Date(profile.createdAt).getFullYear()}
                </p>
            </div>

            {/* ── Profile + Membership ─────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Profile card */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between px-6 py-5 gap-4">
                    {/* Top: name + meta */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <h2
                                className="text-2xl font-normal text-gray-900 leading-tight truncate"
                                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                            >
                                {fullName}
                            </h2>
                            <p className="text-sm text-gray-400 truncate mt-0.5">{profile.email}</p>
                            <div className="flex flex-wrap items-center gap-3 mt-2">
                                {profile.phoneNumber && (
                                    <div className="flex items-center gap-1 text-xs text-gray-400">
                                        <span className="material-symbols-outlined text-[13px] text-gray-300">call</span>
                                        {profile.phoneNumber}
                                    </div>
                                )}
                                {profile.city && (
                                    <div className="flex items-center gap-1 text-xs text-gray-400">
                                        <span className="material-symbols-outlined text-[13px] text-gray-300">location_on</span>
                                        {profile.city}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="shrink-0 text-right">
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400">Medlem siden</p>
                            <p className="text-sm font-normal text-gray-900 mt-0.5" style={{ fontFamily: "'Georgia', serif" }}>
                                {new Date(profile.createdAt).toLocaleDateString("nb-NO", { month: "short", year: "numeric" })}
                            </p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gray-100" />

                    {/* Bottom: stats */}
                    <div className="flex flex-wrap gap-6">
                        <div>
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400">Saldo</p>
                            <p className="text-sm font-bold text-gray-900 mt-0.5">
                                {new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(Number(profile.balance))}
                            </p>
                        </div>
                        <div className="w-px bg-gray-100" />
                        <div>
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400">Arrangementer</p>
                            <p className="text-sm font-bold text-gray-900 mt-0.5">{profile._count.eventsAttending}</p>
                        </div>
                        <div className="w-px bg-gray-100" />
                        <div>
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400">Innlegg</p>
                            <p className="text-sm font-bold text-gray-900 mt-0.5">{profile._count.posts}</p>
                        </div>
                    </div>
                </div>

                {/* Membership card — dark */}
                <div
                    className="rounded-2xl p-5 flex flex-col gap-5"
                    style={{ background: "linear-gradient(145deg, #1a1a1a 0%, #111111 100%)", boxShadow: "0 4px 20px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)" }}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-[0.22em] text-gray-500">Medlemsstatus</span>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${isAccountActive ? "bg-emerald-500/15 border border-emerald-500/25" : "bg-red-500/15 border border-red-500/25"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isAccountActive ? "bg-emerald-400" : "bg-red-400"}`} />
                            <span className={`text-[9px] font-bold uppercase tracking-wide ${isAccountActive ? "text-emerald-300" : "text-red-300"}`}>
                                {isAccountActive ? "Aktiv" : "Inaktiv"}
                            </span>
                        </div>
                    </div>

                    <div className="h-px bg-white/8" />

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-1">Rolle</p>
                                <p className="font-bold text-gray-100 text-base leading-none" style={{ fontFamily: "'Georgia', serif" }}>
                                    {profile.userRole?.name || profile.role}
                                </p>
                            </div>
                            <div className="p-2.5 rounded-xl material-symbols-outlined text-lg bg-white/10 text-gray-300">
                                verified
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-1">Medlemstype</p>
                                <p className="font-bold text-gray-100 text-base leading-none" style={{ fontFamily: "'Georgia', serif" }}>
                                    {profile.membershipType || "Standard"}
                                </p>
                            </div>
                            <div className="p-2.5 rounded-xl material-symbols-outlined text-lg bg-white/10 text-gray-300">
                                card_membership
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Account form ────────────────────────────────────────── */}
            <AccountClient initialProfile={profile} />
        </div>
    );
}
