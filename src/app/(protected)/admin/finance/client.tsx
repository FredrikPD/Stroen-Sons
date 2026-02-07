"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { getCurrentMember } from "@/server/actions/finance";
import { useRouter } from "next/navigation";

// Types for finance data
type Transaction = {
    id: string;
    date: string;
    description: string;
    subDescription?: string;
    category: string;
    type: "INNTEKT" | "UTGIFT";
    amount: number;
    status: string;
};

type FinanceStats = {
    treasuryBalance: number;
    totalIncome: number;
    totalExpenses: number;
    expectedAnnualIncome: number;
    transactions: Transaction[];
};

export default function FinancePortalClientPage() {
    const [currentMember, setCurrentMember] = useState<any>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [financeData, setFinanceData] = useState<FinanceStats | null>(null);
    const [financeLoading, setFinanceLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'INNTEKT' | 'UTGIFT'>('ALL');
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            const member = await getCurrentMember();
            setCurrentMember(member);
            setAuthLoading(false);
            if (!member || member.role !== "ADMIN") {
                router.push("/dashboard");
            }
        };
        checkAuth();
    }, [router]);

    useEffect(() => {
        const fetchFinanceData = async () => {
            if (!currentMember || currentMember.role !== "ADMIN") return;
            try {
                const res = await fetch("/api/admin/finance");
                if (res.ok) {
                    const data = await res.json();
                    setFinanceData(data);
                }
            } catch (error) {
                console.error("Failed to fetch finance data", error);
            } finally {
                setFinanceLoading(false);
            }
        };

        if (!authLoading) {
            fetchFinanceData();
        }
    }, [currentMember, authLoading]);

    if (authLoading || financeLoading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (!currentMember || currentMember.role !== "ADMIN") {
        return null; // Will redirect
    }

    const { treasuryBalance, totalIncome, totalExpenses, expectedAnnualIncome, transactions } = financeData || {
        treasuryBalance: 0,
        totalIncome: 0,
        totalExpenses: 0,
        expectedAnnualIncome: 0,
        transactions: []
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("nb-NO", {
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
        <div className="space-y-6">
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
                    <h2 className="text-xl font-bold text-gray-900">Registrer</h2>
                    <p className="text-gray-500 text-sm">Registrer inntekt, utgift eller faktura</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Card 1: Registrer Inntekt */}
                    <Link href="/admin/finance/income" className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between min-h-[180px] group hover:shadow-md transition-all relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                        <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none">
                            <span className="material-symbols-outlined text-8xl text-emerald-500">add_circle</span>
                        </div>
                        <div className="mb-4 relative z-10">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-lg">add_circle</span>
                            </div>
                            <h3 className="text-base font-bold text-gray-900 mb-1">Inntekter</h3>
                            <p className="text-gray-500 text-xs leading-relaxed">Registrer innbetalte medlemskontigenter</p>
                        </div>
                        <div className="w-full py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 relative z-10">
                            <span className="material-symbols-outlined text-base">arrow_forward</span>
                            Gå til Inntekt
                        </div>
                    </Link>

                    {/* Card 2: Bokfør Utgifter */}
                    <Link href="/admin/finance/expenses" className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between min-h-[180px] group hover:shadow-md transition-all relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
                        <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none">
                            <span className="material-symbols-outlined text-8xl text-red-500">remove_circle</span>
                        </div>
                        <div className="mb-4 relative z-10">
                            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-3 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-lg">remove_circle</span>
                            </div>
                            <h3 className="text-base font-bold text-gray-900 mb-1">Utgifter</h3>
                            <p className="text-gray-500 text-xs leading-relaxed">Registrer utgifter</p>
                        </div>
                        <div className="w-full py-2.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 relative z-10">
                            <span className="material-symbols-outlined text-base">arrow_forward</span>
                            Gå til Utgifter
                        </div>
                    </Link>

                    {/* Card 4: Fakturaer */}
                    <Link href="/admin/finance/invoices" className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between min-h-[180px] group hover:shadow-md transition-all relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
                        <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none">
                            <span className="material-symbols-outlined text-8xl text-violet-500">receipt_long</span>
                        </div>
                        <div className="mb-4 relative z-10">
                            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center mb-3 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-lg">receipt_long</span>
                            </div>
                            <h3 className="text-base font-bold text-gray-900 mb-1">Fakturaer</h3>
                            <p className="text-gray-500 text-xs leading-relaxed">Opprett og administrer ekstraordinære krav</p>
                        </div>
                        <div className="w-full py-2.5 bg-violet-50 text-violet-700 hover:bg-violet-100 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 relative z-10">
                            <span className="material-symbols-outlined text-base">arrow_forward</span>
                            Se Fakturaer
                        </div>
                    </Link>
                </div>
            </div>

            {/* Innsikt Section */}
            <div>
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Innsikt</h2>
                    <p className="text-gray-500 text-sm">Innsikt i økonomien</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Card 4: Saldo og Historikk */}
                    <Link href="/admin/finance/balance" className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between min-h-[180px] group hover:shadow-md transition-all relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
                        <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none">
                            <span className="material-symbols-outlined text-8xl text-blue-500">account_balance_wallet</span>
                        </div>
                        <div className="mb-4 relative z-10">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
                            </div>
                            <h3 className="text-base font-bold text-gray-900 mb-1">Saldo og Historikk</h3>
                            <p className="text-gray-500 text-xs leading-relaxed">Se saldo og historikk for enkeltmedlemmer</p>
                        </div>
                        <div className="w-full py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 relative z-10">
                            <span className="material-symbols-outlined text-base">arrow_forward</span>
                            Se Saldo
                        </div>
                    </Link>

                    {/* Card 5: Transaksjoner */}
                    <Link href="/admin/finance/transactions" className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between min-h-[180px] group hover:shadow-md transition-all relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />
                        <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none">
                            <span className="material-symbols-outlined text-8xl text-cyan-500">list</span>
                        </div>
                        <div className="mb-4 relative z-10">
                            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center mb-3 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-lg">list</span>
                            </div>
                            <h3 className="text-base font-bold text-gray-900 mb-1">Transaksjoner</h3>
                            <p className="text-gray-500 text-xs leading-relaxed">Se oversikt over alle transaksjoner</p>
                        </div>
                        <div className="w-full py-2.5 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 relative z-10">
                            <span className="material-symbols-outlined text-base">arrow_forward</span>
                            Se Transaksjoner
                        </div>
                    </Link>

                    {/* Card 6: Regnskap */}
                    <Link href="/admin/finance/reports" className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between min-h-[180px] group hover:shadow-md transition-all relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-transparent pointer-events-none" />
                        <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none">
                            <span className="material-symbols-outlined text-8xl text-slate-500">table_view</span>
                        </div>
                        <div className="mb-4 relative z-10">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center mb-3 group-hover:bg-slate-600 group-hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-lg">table_view</span>
                            </div>
                            <h3 className="text-base font-bold text-gray-900 mb-1">Regnskap</h3>
                            <p className="text-gray-500 text-xs leading-relaxed">Generer rapporter og hent ut bilag</p>
                        </div>
                        <div className="w-full py-2.5 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 relative z-10">
                            <span className="material-symbols-outlined text-base">arrow_forward</span>
                            Gå til Regnskap
                        </div>
                    </Link>
                </div>
            </div>

        </div>
    );
}
