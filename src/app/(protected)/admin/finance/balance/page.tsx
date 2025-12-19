"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCurrentMember } from "@/server/actions/finance";

type PaymentRequest = {
    id: string;
    title: string;
    description: string | null;
    amount: number;
    status: "PENDING" | "PAID" | "WAIVED";
    category: "MEMBERSHIP_FEE" | "EVENT" | "OTHER";
    dueDate: string | null;
};

type MemberBalance = {
    id: string;
    name: string;
    email: string;
    balance: number;
    unpaidCount: number;
    requests: PaymentRequest[];
};

export default function MemberBalancePage() {
    const [members, setMembers] = useState<MemberBalance[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const checkAuthAndFetch = async () => {
            const member = await getCurrentMember();
            if (!member || member.role !== "ADMIN") {
                router.push("/dashboard");
                return;
            }

            try {
                const res = await fetch("/api/admin/finance/balance");
                if (res.ok) {
                    const data = await res.json();
                    setMembers(data);
                }
            } catch (error) {
                console.error("Failed to fetch member balances", error);
            } finally {
                setLoading(false);
            }
        };
        checkAuthAndFetch();
    }, [router]);

    const filteredMembers = members.filter(member =>
        member.name.toLowerCase().includes(search.toLowerCase()) ||
        member.email.toLowerCase().includes(search.toLowerCase())
    );

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(amount);
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString("nb-NO", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <Link href="/admin/finance" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                    <span className="material-symbols-outlined text-lg mr-1">arrow_back</span>
                    Tilbake til oversikt
                </Link>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Saldo og Historikk</h1>
                <p className="text-gray-500 text-sm max-w-3xl">
                    Oversikt over medlemmenes betalingskrav og historikk.
                </p>
            </div>

            {/* Search */}
            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined">search</span>
                <input
                    type="text"
                    placeholder="Søk etter navn eller e-post..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
            </div>

            {/* Members List */}
            <div className="space-y-4">
                {filteredMembers.map((member) => (
                    <div key={member.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-md">
                        {/* Member Row Header */}
                        <div
                            onClick={() => setExpandedMemberId(expandedMemberId === member.id ? null : member.id)}
                            className="p-6 cursor-pointer flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${member.unpaidCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    {member.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{member.name}</h3>
                                    <p className="text-sm text-gray-500">{member.email}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="text-right min-w-[80px]">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ubetalte</p>
                                    <p className={`font-bold ${member.unpaidCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                        {member.unpaidCount}
                                    </p>
                                </div>
                                <span className={`material-symbols-outlined text-gray-300 transition-transform duration-300 ${expandedMemberId === member.id ? 'rotate-180' : ''}`}>
                                    expand_more
                                </span>
                            </div>
                        </div>

                        {/* Expanded Details - Payment History */}
                        {expandedMemberId === member.id && (
                            <div className="border-t border-gray-100 bg-gray-50/50 p-6 animate-in slide-in-from-top-2 duration-200">
                                <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-gray-400 text-lg">history</span>
                                    Betalingshistorikk
                                </h4>

                                {member.requests && member.requests.length > 0 ? (
                                    <div className="grid gap-2">
                                        {member.requests.map((req) => (
                                            <div key={req.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-1 h-12 rounded-full ${req.status === 'PAID' ? 'bg-emerald-500' : (req.status === 'WAIVED' ? 'bg-gray-400' : 'bg-amber-400')}`}></div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-sm">{req.title}</p>
                                                        <p className="text-xs text-gray-500">{req.category === 'MEMBERSHIP_FEE' ? 'Medlemskontigent' : 'Faktura'}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Beløp</p>
                                                        <p className="text-sm font-medium text-gray-900">{formatCurrency(req.amount)}</p>
                                                    </div>

                                                    <div className="text-right min-w-[100px]">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Forfall</p>
                                                        <p className="text-sm text-gray-500">{formatDate(req.dueDate)}</p>
                                                    </div>

                                                    <div className="text-right min-w-[100px]">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</p>
                                                        {req.status === 'PAID' ? (
                                                            <div className="flex items-center justify-end gap-1 text-emerald-600 text-sm font-bold">
                                                                <span className="material-symbols-outlined text-base">check_circle</span>
                                                                <span>Betalt</span>
                                                            </div>
                                                        ) : req.status === 'WAIVED' ? (
                                                            <div className="flex items-center justify-end gap-1 text-gray-500 text-sm font-bold">
                                                                <span className="material-symbols-outlined text-base">remove_circle</span>
                                                                <span>Fritatt</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-end gap-1 text-amber-500 text-sm font-bold">
                                                                <span className="material-symbols-outlined text-base">pending</span>
                                                                <span>Ubetalt</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500 text-sm bg-gray-100/50 rounded-xl border border-dashed border-gray-300">
                                        Ingen betalingskrav funnet for dette medlemmet.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {filteredMembers.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <span className="material-symbols-outlined text-3xl">search_off</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Ingen medlemmer funnet</h3>
                        <p className="text-gray-500 text-sm">Prøv et annet søkeord.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
