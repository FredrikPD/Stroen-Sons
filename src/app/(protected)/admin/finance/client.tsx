"use client";

import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import type { FinanceStats } from "@/lib/admin-finance";

const COLOR_MAP: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
    red: "bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white",
    violet: "bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white",
    blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
    cyan: "bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white",
    slate: "bg-slate-50 text-slate-600 group-hover:bg-slate-600 group-hover:text-white",
};

const QUICK_ACTIONS = [
    { href: "/admin/finance/income", icon: "add_circle", color: "emerald", label: "Registrer Inntekt", desc: "Loggfør medlemskontingenter" },
    { href: "/admin/finance/expenses", icon: "remove_circle", color: "red", label: "Registrer Utgift", desc: "Loggfør regninger og kjøp" },
    { href: "/admin/finance/invoices", icon: "receipt_long", color: "violet", label: "Fakturaer", desc: "Administrer betalingskrav" },
    { href: "/admin/finance/balance", icon: "account_balance_wallet", color: "blue", label: "Saldooversikt", desc: "Se saldo for medlemmer" },
    { href: "/admin/finance/transactions", icon: "swap_vert", color: "cyan", label: "Transaksjoner", desc: "Se alle bevegelser" },
    { href: "/admin/finance/reports", icon: "table_view", color: "slate", label: "Regnskap", desc: "Rapporter og bilag" },
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
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Økonomiportal</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Sentralisert oversikt over klubbens økonomi — {currentYear}
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Balance — featured dark card */}
                <div className="bg-slate-900 p-5 rounded-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-950 pointer-events-none" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-1.5 mb-4">
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">account_balance</span>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">NÅVÆRENDE SALDO</p>
                        </div>
                        <p className="text-3xl font-bold text-white tabular-nums">{formatCurrency(treasuryBalance)}</p>
                        <p className="text-xs text-slate-500 mt-2">Tilgjengelig på konto</p>
                    </div>
                </div>

                {/* Income */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-emerald-500 text-[18px]">savings</span>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">TOTAL INNTEKT</p>
                            </div>
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                                {incomeProgress.toFixed(0)}%
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatCurrency(totalIncome)}</p>
                        <div className="mt-3 w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${Math.min(incomeProgress, 100)}%` }}
                            />
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1.5">av {formatCurrency(expectedAnnualIncome)} forventet</p>
                    </div>
                </div>

                {/* Expenses */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-red-500 text-[18px]">payments</span>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">TOTAL UTGIFT</p>
                            </div>
                            <span className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                                {expenseRatio.toFixed(0)}%
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatCurrency(Math.abs(totalExpenses))}</p>
                        <div className="mt-3 w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full ${expenseRatio > 80 ? "bg-red-500" : expenseRatio > 50 ? "bg-amber-400" : "bg-red-400"}`}
                                style={{ width: `${Math.min(expenseRatio, 100)}%` }}
                            />
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1.5">brukt av total inntekt</p>
                    </div>
                </div>

            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-base font-bold text-gray-900 mb-3">Handlinger</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {QUICK_ACTIONS.map(({ href, icon, color, label, desc }) => (
                        <Link
                            key={href}
                            href={href}
                            className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3.5 hover:shadow-md hover:border-gray-300 transition-all group"
                        >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${COLOR_MAP[color]}`}>
                                <span className="material-symbols-outlined text-xl">{icon}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-gray-900 text-sm leading-tight">{label}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                            </div>
                            <span className="material-symbols-outlined text-gray-300 text-[18px] group-hover:text-gray-500 transition-colors shrink-0">
                                chevron_right
                            </span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Transactions + Member Balances */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Transactions */}
                <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-bold text-gray-900">Siste Transaksjoner</h2>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
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
                            <Link
                                href="/admin/finance/transactions"
                                className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                            >
                                Se alle
                            </Link>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/60">
                                        <th className="py-3 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Dato</th>
                                        <th className="py-3 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Beskrivelse</th>
                                        <th className="py-3 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Kategori</th>
                                        <th className="py-3 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Beløp</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredTransactions.slice(0, 8).map((tx) => (
                                        <tr
                                            key={tx.id}
                                            onClick={() => router.push(`/admin/finance/transactions/${tx.id}`)}
                                            className="hover:bg-gray-50/70 transition-colors cursor-pointer"
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
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
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
                                                <p className="text-sm text-gray-400">Ingen transaksjoner funnet</p>
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
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-bold text-gray-900">Medlemssaldo</h2>
                        <Link
                            href="/admin/finance/balance"
                            className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                        >
                            Se alle
                        </Link>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="divide-y divide-gray-50">
                            {memberBalances.map((member) => (
                                <div key={member.id} className="flex items-center justify-between px-5 py-3.5">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
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
                                    <p className="text-sm text-gray-400">Ingen aktive saldoer funnet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
