"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getAllTransactions } from "@/server/actions/finance";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/ui/LoadingState";

// Define Transaction Type (matching server action return)
type Transaction = {
    id: string;
    date: Date;
    description: string;
    category: string;
    type: "INNTEKT" | "UTGIFT";
    amount: number;
    members?: string[]; // Added members list
};

export default function AllTransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'INNTEKT' | 'UTGIFT'>('ALL');

    // State to track which months are collapsed (store Month Year strings)
    const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
    const router = useRouter();

    useEffect(() => {
        const loadData = async () => {
            const res = await getAllTransactions();
            if (res.success && res.transactions) {
                // @ts-ignore
                setTransactions(res.transactions);

                // Initialize Collapsed State (First month OPEN, others CLOSED)
                const tempMonths = Array.from(new Set(res.transactions.map((tx: any) => {
                    const date = new Date(tx.date);
                    const key = date.toLocaleString('nb-NO', { month: 'long', year: 'numeric' });
                    return key.charAt(0).toUpperCase() + key.slice(1);
                })));

                const initialCollapsed = new Set<string>();
                // tempMonths.slice(1).forEach((m: string) => initialCollapsed.add(m)); // OLD: Open first only
                // NEW: Open ALL initially? Or stick to first? User wants "filter within each month".
                // Let's keep first open as default.
                tempMonths.slice(1).forEach((m: unknown) => initialCollapsed.add(m as string));

                setCollapsedMonths(initialCollapsed);
            }
            setLoading(false);
        };
        loadData();
    }, []);

    const toggleMonth = (month: string) => {
        const newCollapsed = new Set(collapsedMonths);
        if (newCollapsed.has(month)) {
            newCollapsed.delete(month); // Open
        } else {
            newCollapsed.add(month); // Close
        }
        setCollapsedMonths(newCollapsed);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("nb-NO", {
            style: "currency",
            currency: "NOK",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    // Filter transactions FIRST
    const filteredTransactions = transactions.filter(tx => {
        if (filter === 'ALL') return true;
        return tx.type === filter;
    });

    // THEN Group by Month Year
    const groupedTransactions = filteredTransactions.reduce((acc, tx) => {
        const date = new Date(tx.date);
        const key = date.toLocaleString('nb-NO', { month: 'long', year: 'numeric' });
        const monthYear = key.charAt(0).toUpperCase() + key.slice(1);

        if (!acc[monthYear]) {
            acc[monthYear] = [];
        }
        acc[monthYear].push(tx);
        return acc;
    }, {} as Record<string, Transaction[]>);

    // Get list of months (keys) from the FILTERED list to avoid empty month headers
    const months = Array.from(new Set(filteredTransactions.map(tx => {
        const date = new Date(tx.date);
        const key = date.toLocaleString('nb-NO', { month: 'long', year: 'numeric' });
        return key.charAt(0).toUpperCase() + key.slice(1);
    })));

    if (loading) {
        return <LoadingState />;
    }

    return (
        <div className="space-y-6">
            {/* Header & Filter */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Transaksjonshistorikk</h1>
                    <p className="text-gray-500 text-sm max-w-3xl mt-1">
                        Fullstendig oversikt over alle registrerte transaksjoner.
                    </p>
                </div>

                {/* Filter Controls */}
                <div className="bg-gray-100 p-1 rounded-lg flex text-sm font-medium">
                    <button
                        onClick={() => setFilter('ALL')}
                        className={`px-4 py-1.5 rounded-md transition-all ${filter === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Alle
                    </button>
                    <button
                        onClick={() => setFilter('INNTEKT')}
                        className={`px-4 py-1.5 rounded-md transition-all ${filter === 'INNTEKT' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Inntekt
                    </button>
                    <button
                        onClick={() => setFilter('UTGIFT')}
                        className={`px-4 py-1.5 rounded-md transition-all ${filter === 'UTGIFT' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Utgift
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {months.map(month => {
                    const isCollapsed = collapsedMonths.has(month);
                    const txs = groupedTransactions[month];
                    // Calculate net total for the month (Income - Expense) based on VISIBLE transactions
                    const totalMonth = txs.reduce((sum, t) => sum + t.amount, 0);

                    return (
                        <div key={month} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm transition-all duration-200">
                            {/* Clickable Header */}
                            <div
                                onClick={() => toggleMonth(month)}
                                className="bg-gray-50/80 backdrop-blur-sm px-6 py-4 border-b border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors group select-none"
                            >
                                <div className="flex items-center gap-3">
                                    {/* Rotating Chevron */}
                                    <span className={`material-symbols-outlined text-gray-400 text-2xl transition-transform duration-300 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}>
                                        expand_more
                                    </span>
                                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest">{month}</h2>
                                    {/* Count Badge */}
                                    <span className="text-[10px] font-bold text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                                        {txs.length}
                                    </span>
                                </div>

                                <div className="text-sm font-medium text-gray-500">
                                    {isCollapsed && (
                                        <span>
                                            Sum: <span className={totalMonth >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                                                {totalMonth > 0 ? '+' : ''}{formatCurrency(totalMonth)}
                                            </span>
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Collapsible Content */}
                            {!isCollapsed && (
                                <div className="divide-y divide-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {txs.map(tx => (
                                        <Link href={`/admin/finance/transactions/${tx.id}`} key={tx.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 transition-colors group cursor-pointer block">
                                            {/* Date */}
                                            <div className="col-span-12 sm:col-span-2 flex items-center gap-2">
                                                <span className="text-sm text-gray-500">{new Date(tx.date).getDate()}. {new Date(tx.date).toLocaleString('nb-NO', { month: 'short' })}</span>
                                            </div>

                                            {/* Description, Category AND Members */}
                                            <div className="col-span-8 sm:col-span-6">
                                                <div className="flex flex-col">
                                                    <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{tx.description}</p>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                                            {tx.category}
                                                        </span>
                                                        {tx.members && tx.members.length > 0 && (
                                                            <div className="flex gap-1 flex-wrap">
                                                                {tx.members.slice(0, 3).map(m => (
                                                                    <span key={m} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border border-transparent ${tx.type === 'INNTEKT' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
                                                                        <span className="material-symbols-outlined text-[10px] mr-1">person</span>
                                                                        {m}
                                                                    </span>
                                                                ))}
                                                                {tx.members.length > 3 && (
                                                                    <span
                                                                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200 cursor-help"
                                                                        title={tx.members.slice(3).join(', ')}
                                                                    >
                                                                        +{tx.members.length - 3} andre
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Amount */}
                                            <div className="col-span-4 sm:col-span-4 text-right">
                                                <span className={`text-sm font-bold ${tx.type === 'INNTEKT' ? 'text-emerald-600' : 'text-gray-900'}`}>
                                                    {tx.type === 'INNTEKT' ? '+' : ''} {formatCurrency(tx.amount)}
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                    {/* Month Footer Summary */}
                                    <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-end items-center text-xs font-medium text-gray-500">
                                        Månedstotal: <span className={`ml-2 font-bold ${totalMonth >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {totalMonth > 0 ? '+' : ''}{formatCurrency(totalMonth)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {months.length === 0 && (
                    <div className="text-center py-20 text-gray-500 bg-white rounded-2xl border border-gray-200">
                        <span className="material-symbols-outlined text-4xl mb-2 opacity-50">filter_list_off</span>
                        <p>Ingen transaksjoner funnet med valgt filter.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
