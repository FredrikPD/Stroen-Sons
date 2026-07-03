"use client";

import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import type { FinanceStats } from "@/lib/admin-finance";
import { AdminHero, AdminSectionHeader, SERIF, seeAllLink } from "@/components/admin/ui";

const QUICK_ACTIONS = [
    { href: "/admin/finance/income", icon: "add_circle", label: "Registrer Inntekt", desc: "Loggfør medlemskontingenter" },
    { href: "/admin/finance/expenses", icon: "remove_circle", label: "Registrer Utgift", desc: "Loggfør regninger og kjøp" },
    { href: "/admin/finance/invoices", icon: "receipt_long", label: "Fakturaer", desc: "Administrer betalingskrav" },
    { href: "/admin/finance/balance", icon: "account_balance_wallet", label: "Saldooversikt", desc: "Se saldo for medlemmer" },
    { href: "/admin/finance/transactions", icon: "swap_vert", label: "Transaksjoner", desc: "Se alle bevegelser" },
    { href: "/admin/finance/reports", icon: "table_view", label: "Regnskap", desc: "Rapporter og bilag" },
];

export default function FinancePortalClientPage({ initialData }: { initialData: FinanceStats }) {
    const router = useRouter();
    const [financeData] = useState<FinanceStats>(initialData);
    const [filter, setFilter] = useState<"ALL" | "INNTEKT" | "UTGIFT">("ALL");

    const {
        treasuryBalance,
        totalIncome,
        totalExpenses,
        expectedAnnualIncome,
        transactions,
        memberBalances,
    } = financeData || {
        treasuryBalance: 0,
        totalIncome: 0,
        totalExpenses: 0,
        expectedAnnualIncome: 0,
        transactions: [],
        memberBalances: [],
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(amount);

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString("nb-NO", { day: "numeric", month: "short" });

    const incomeProgress = expectedAnnualIncome > 0 ? (totalIncome / expectedAnnualIncome) * 100 : 0;
    const expenseRatio = totalIncome > 0 ? (Math.abs(totalExpenses) / totalIncome) * 100 : 0;

    const filteredTransactions = transactions.filter((tx) => {
        if (filter === "ALL") return true;
        return tx.type === filter;
    });

    const currentYear = new Date().getFullYear();

    return (
        <div>
            {/* Hero with treasury / income / expense KPIs */}
            <AdminHero
                eyebrow="Økonomi"
                title="Økonomiportal"
                subtitle={`Sentralisert oversikt over klubbens økonomi — ${currentYear}`}
                stats={[
                    {
                        icon: "account_balance",
                        label: "Nåværende saldo",
                        value: formatCurrency(treasuryBalance),
                        sub: "Tilgjengelig på konto",
                    },
                    {
                        icon: "savings",
                        label: "Total inntekt",
                        value: formatCurrency(totalIncome),
                        sub: `${incomeProgress.toFixed(0)}% av ${formatCurrency(expectedAnnualIncome)}`,
                        valueClass: "text-emerald-400",
                    },
                    {
                        icon: "payments",
                        label: "Total utgift",
                        value: formatCurrency(Math.abs(totalExpenses)),
                        sub: `${expenseRatio.toFixed(0)}% av inntekt`,
                        valueClass: "text-red-400",
                    },
                    {
                        icon: "trending_up",
                        label: "Netto",
                        value: formatCurrency(totalIncome - Math.abs(totalExpenses)),
                        sub: "Inntekt minus utgift",
                        valueClass: totalIncome - Math.abs(totalExpenses) >= 0 ? "text-emerald-400" : "text-red-400",
                    },
                ]}
            />

            {/* Quick Actions */}
            <div className="mt-12">
                <AdminSectionHeader title="Handlinger" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {QUICK_ACTIONS.map(({ href, icon, label, desc }) => (
                        <Link
                            key={href}
                            href={href}
                            className="group rounded-2xl bg-white border border-border-color p-5 flex items-center gap-4 hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-[0_6px_22px_rgba(75,58,30,0.08)] transition-all"
                        >
                            <div className="w-[42px] h-[42px] rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-[#0f0e0c] group-hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-[21px]">{icon}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-normal text-gray-900 leading-tight" style={{ fontFamily: SERIF }}>
                                    {label}
                                </h3>
                                <p className="text-[13px] text-text-secondary mt-0.5">{desc}</p>
                            </div>
                            <span className="material-symbols-outlined text-gray-300 text-[18px] group-hover:text-primary transition-colors shrink-0">
                                chevron_right
                            </span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Transactions + Member Balances */}
            <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Transactions */}
                <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-4 gap-4">
                        <h2 className="text-2xl font-normal text-gray-900" style={{ fontFamily: SERIF }}>
                            Siste Transaksjoner
                        </h2>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-0.5 bg-cream rounded-lg p-0.5 border border-border-color">
                                {(["ALL", "INNTEKT", "UTGIFT"] as const).map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`text-xs font-medium px-2.5 py-1 rounded-md transition-all ${
                                            filter === f
                                                ? "bg-white text-gray-900 shadow-sm"
                                                : "text-gray-500 hover:text-gray-700"
                                        }`}
                                    >
                                        {f === "ALL" ? "Alle" : f === "INNTEKT" ? "Inntekt" : "Utgift"}
                                    </button>
                                ))}
                            </div>
                            <Link href="/admin/finance/transactions" className={seeAllLink}>
                                Se alle
                            </Link>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-white border border-border-color overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border-color bg-[#faf8f3]">
                                        <th className="py-3 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Dato</th>
                                        <th className="py-3 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Beskrivelse</th>
                                        <th className="py-3 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Kategori</th>
                                        <th className="py-3 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Beløp</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-color">
                                    {filteredTransactions.slice(0, 8).map((tx) => (
                                        <tr
                                            key={tx.id}
                                            onClick={() => router.push(`/admin/finance/transactions/${tx.id}`)}
                                            className="hover:bg-black/[0.02] transition-colors cursor-pointer"
                                        >
                                            <td className="py-3.5 px-5 text-sm text-gray-500 whitespace-nowrap">
                                                {formatDate(tx.date)}
                                            </td>
                                            <td className="py-3.5 px-5">
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                            tx.type === "INNTEKT" ? "bg-emerald-500" : "bg-red-400"
                                                        }`}
                                                    />
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900 leading-tight">
                                                            {tx.description}
                                                        </div>
                                                        {tx.member && (
                                                            <div className="text-xs text-gray-400 mt-0.5">
                                                                {tx.member.firstName} {tx.member.lastName}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-5 hidden md:table-cell">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-cream text-text-secondary">
                                                    {tx.category}
                                                </span>
                                            </td>
                                            <td className={`py-3.5 px-5 text-sm font-bold text-right tabular-nums whitespace-nowrap ${
                                                tx.amount > 0 ? "text-emerald-600" : "text-red-500"
                                            }`}>
                                                {tx.amount > 0 ? "+" : ""}{formatCurrency(tx.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredTransactions.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center">
                                                <span className="material-symbols-outlined text-gray-200 text-4xl block mb-2">
                                                    receipt_long
                                                </span>
                                                <p className="text-sm text-gray-400 italic" style={{ fontFamily: SERIF }}>
                                                    Ingen transaksjoner funnet
                                                </p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Member Balances */}
                <div>
                    <div className="flex items-center justify-between mb-4 gap-4">
                        <h2 className="text-2xl font-normal text-gray-900" style={{ fontFamily: SERIF }}>
                            Medlemssaldo
                        </h2>
                        <Link href="/admin/finance/balance" className={seeAllLink}>
                            Se alle
                        </Link>
                    </div>

                    <div className="rounded-2xl bg-white border border-border-color overflow-hidden">
                        <div className="divide-y divide-border-color">
                            {memberBalances.map((member) => (
                                <div key={member.id} className="flex items-center justify-between px-5 py-3.5">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                            {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold text-gray-900 truncate">
                                                {member.firstName} {member.lastName}
                                            </div>
                                            <div className="text-[11px] text-gray-400 truncate">
                                                {member.role === "ADMIN" ? "Administrator" : member.membershipType}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`text-sm font-bold tabular-nums shrink-0 ml-3 ${
                                        member.balance >= 0 ? "text-emerald-600" : "text-red-500"
                                    }`}>
                                        {formatCurrency(member.balance)}
                                    </div>
                                </div>
                            ))}
                            {memberBalances.length === 0 && (
                                <div className="py-10 text-center">
                                    <p className="text-sm text-gray-400 italic" style={{ fontFamily: SERIF }}>
                                        Ingen aktive saldoer funnet
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
