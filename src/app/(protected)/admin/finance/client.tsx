"use client";

import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import type { FinanceStats } from "@/lib/admin-finance";

export default function FinancePortalClientPage({ initialData }: { initialData: FinanceStats }) {
    const router = useRouter();
    const [financeData] = useState<FinanceStats>(initialData);
    const [filter, setFilter] = useState<'ALL' | 'INNTEKT' | 'UTGIFT'>('ALL');

    const { treasuryBalance, totalIncome, totalExpenses, expectedAnnualIncome, transactions, memberBalances } = financeData || {
        treasuryBalance: 0,
        totalIncome: 0,
        totalExpenses: 0,
        expectedAnnualIncome: 0,
        transactions: [],
        memberBalances: []
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 2 }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    };

    // Derived Metrics
    // 1. Income Progress (Total Income / Expected Annual Income)
    const incomeProgress = expectedAnnualIncome > 0 ? (totalIncome / expectedAnnualIncome) * 100 : 0;

    // 2. Expense Ratio (How much of Income is used?)
    const expenseRatio = totalIncome > 0 ? (Math.abs(totalExpenses) / totalIncome) * 100 : 0;

    // Filtered Transactions
    const filteredTransactions = transactions.filter(tx => {
        if (filter === 'ALL') return true;
        return tx.type === filter;
    });

    const currentYear = new Date().getFullYear();

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Økonomiportal</h1>
                    <p className="text-gray-500 text-sm max-w-3xl">
                        Sentralisert oversikt over klubbens økonomi. Registrer nye transaksjoner og se løpende statistikk.
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Balance */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">NÅVÆRENDE SALDO</p>
                        <p className="text-3xl font-bold text-gray-900 mb-2">{formatCurrency(treasuryBalance)}</p>
                        <div className="text-xs font-medium text-gray-500">
                            Tilgjengelig på konto
                        </div>
                    </div>
                    <div className="absolute top-4 right-4 text-gray-100">
                        <span className="material-symbols-outlined text-7xl opacity-50">account_balance</span>
                    </div>
                </div>

                {/* Total Income */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">TOTAL INNTEKT ({currentYear})</p>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{incomeProgress.toFixed(0)}%</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 mb-4">{formatCurrency(totalIncome)}</p>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(incomeProgress, 100)}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-2">av forventet {formatCurrency(expectedAnnualIncome)}</p>
                    </div>
                    <div className="absolute top-4 right-4 text-gray-100">
                        <span className="material-symbols-outlined text-7xl opacity-50">savings</span>
                    </div>
                </div>

                {/* Total Expense */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">TOTAL UTGIFT ({currentYear})</p>
                            <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{expenseRatio.toFixed(0)}%</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 mb-4">{formatCurrency(Math.abs(totalExpenses))}</p>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.min(expenseRatio, 100)}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-2">av total inntekt brukt</p>
                    </div>
                    <div className="absolute top-4 right-4 text-gray-100">
                        <span className="material-symbols-outlined text-7xl opacity-50">payments</span>
                    </div>
                </div>
            </div>

            {/* Quick Actions Section */}
            <div>
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Handlinger</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Card 1: Registrer Inntekt */}
                    <Link href="/admin/finance/income" className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-all group">
                        <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                            <span className="material-symbols-outlined text-2xl">add_circle</span>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Registrer Inntekt</h3>
                            <p className="text-sm text-gray-500">Loggfør medlemskontingenter</p>
                        </div>
                    </Link>

                    {/* Card 2: Registrer Utgift */}
                    <Link href="/admin/finance/expenses" className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-all group">
                        <div className="w-12 h-12 rounded-lg bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors shrink-0">
                            <span className="material-symbols-outlined text-2xl">remove_circle</span>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Registrer Utgift</h3>
                            <p className="text-sm text-gray-500">Loggfør regninger og kjøp</p>
                        </div>
                    </Link>

                    {/* Card 3: Fakturaer */}
                    <Link href="/admin/finance/invoices" className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-all group">
                        <div className="w-12 h-12 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-colors shrink-0">
                            <span className="material-symbols-outlined text-2xl">receipt_long</span>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Fakturaer</h3>
                            <p className="text-sm text-gray-500">Administrer betalingskrav</p>
                        </div>
                    </Link>

                    {/* Card 4: Saldo og Historikk */}
                    <Link href="/admin/finance/balance" className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-all group">
                        <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                            <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Saldooversikt</h3>
                            <p className="text-sm text-gray-500">Se saldo for medlemmer</p>
                        </div>
                    </Link>

                    {/* Card 5: Transaksjoner */}
                    <Link href="/admin/finance/transactions" className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-all group">
                        <div className="w-12 h-12 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:bg-cyan-600 group-hover:text-white transition-colors shrink-0">
                            <span className="material-symbols-outlined text-2xl">list</span>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Transaksjoner</h3>
                            <p className="text-sm text-gray-500">Se alle bevegelser</p>
                        </div>
                    </Link>

                    {/* Card 6: Regnskap */}
                    <Link href="/admin/finance/reports" className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-all group">
                        <div className="w-12 h-12 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center group-hover:bg-slate-600 group-hover:text-white transition-colors shrink-0">
                            <span className="material-symbols-outlined text-2xl">table_view</span>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Regnskap</h3>
                            <p className="text-sm text-gray-500">Rapporter og bilag</p>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Dashboard Sections: Transactions and Member Balances */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Transactions (Left 2/3) */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">Siste Transaksjoner</h2>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/50">
                                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">DATO</th>
                                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">BESKRIVELSE</th>
                                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">KATEGORI</th>
                                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">BELØP</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {transactions.slice(0, 5).map((tx) => (
                                        <tr
                                            key={tx.id}
                                            onClick={() => router.push(`/admin/finance/transactions/${tx.id}`)}
                                            className="group hover:bg-gray-50/50 transition-colors cursor-pointer"
                                        >
                                            <td className="py-4 px-6 text-sm text-gray-600 whitespace-nowrap">
                                                {formatDate(tx.date)}
                                            </td>
                                            <td className="py-4 px-6 text-sm text-gray-900">
                                                <div className="font-medium">{tx.description}</div>
                                                {tx.member && (
                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                        {tx.member.firstName} {tx.member.lastName}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                                    {tx.category}
                                                </span>
                                            </td>
                                            <td className={`py-4 px-6 text-sm font-bold text-right whitespace-nowrap ${tx.amount > 0 ? "text-emerald-600" : "text-red-600"
                                                }`}>
                                                {tx.amount > 0 ? "+" : ""}{formatCurrency(tx.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                    {transactions.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-gray-500 text-sm italic">
                                                Ingen nylige transaksjoner funnet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Member Balances (Right 1/3) */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">Medlemssaldo</h2>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <div className="space-y-6">
                            {memberBalances.map((member) => (
                                <div key={member.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full bg-gradient-to-br from-indigo-100 to-white border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shadow-sm">
                                            {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-gray-900">
                                                {member.firstName} {member.lastName}
                                            </div>
                                            <div className="text-xs text-gray-500 uppercase tracking-wide">
                                                {member.role === 'ADMIN' ? 'Administrator' : member.membershipType}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-sm font-bold ${member.balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                            {formatCurrency(member.balance)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {memberBalances.length === 0 && (
                                <div className="text-center py-4 text-gray-500 text-sm italic">
                                    Ingen aktive saldoer funnet.
                                </div>
                            )}
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <Link href="/admin/finance/balance" className="flex items-center justify-center w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200">
                                Se Alle
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
