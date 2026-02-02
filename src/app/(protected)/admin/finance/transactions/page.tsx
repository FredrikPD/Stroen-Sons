"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getAllTransactions } from "@/server/actions/finance";
import { useRouter } from "next/navigation";

// Define Transaction Type (matching server action return)
type Transaction = {
    id: string;
    date: Date;
    description: string;
    category: string;
    type: "INNTEKT" | "UTGIFT";
    amount: number;
};

export default function AllTransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    // State to track which months are collapsed.
    // We store the keys (Month Year strings) of collapsed sections.
    const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
    const router = useRouter();

    useEffect(() => {
        const loadData = async () => {
            const res = await getAllTransactions();
            if (res.success && res.transactions) {
                setTransactions(res.transactions);

                // Initialize Collapsed State
                // We want the FIRST month (most recent) to be OPEN (not in set).
                // We want ALL OTHER months to be CLOSED (in set).

                // 1. Get all unique month keys in order
                const tempMonths = Array.from(new Set(res.transactions.map(tx => {
                    const date = new Date(tx.date);
                    const key = date.toLocaleString('nb-NO', { month: 'long', year: 'numeric' });
                    // Capitalize first letter
                    return key.charAt(0).toUpperCase() + key.slice(1);
                })));

                // 2. Add all except the first one to the collapsed set
                const initialCollapsed = new Set<string>();
                tempMonths.slice(1).forEach(m => initialCollapsed.add(m));

                setCollapsedMonths(initialCollapsed);
            }
            setLoading(false);
        };
        loadData();
    }, []);

    const toggleMonth = (month: string) => {
        const newCollapsed = new Set(collapsedMonths);
        if (newCollapsed.has(month)) {
            newCollapsed.delete(month); // Open it
        } else {
            newCollapsed.add(month); // Close it
        }
        setCollapsedMonths(newCollapsed);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(amount);
    };

    // Group transactions by Month Year
    const groupedTransactions = transactions.reduce((acc, tx) => {
        const date = new Date(tx.date);
        const key = date.toLocaleString('nb-NO', { month: 'long', year: 'numeric' });
        const monthYear = key.charAt(0).toUpperCase() + key.slice(1);

        if (!acc[monthYear]) {
            acc[monthYear] = [];
        }
        acc[monthYear].push(tx);
        return acc;
    }, {} as Record<string, Transaction[]>);

    // Get list of months (keys) preserving order from original list
    const months = Array.from(new Set(transactions.map(tx => {
        const date = new Date(tx.date);
        const key = date.toLocaleString('nb-NO', { month: 'long', year: 'numeric' });
        return key.charAt(0).toUpperCase() + key.slice(1);
    })));

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Transaksjonshistorikk</h1>
                    <p className="text-gray-500 text-sm max-w-3xl mt-1">
                        Fullstendig oversikt over alle registrerte transaksjoner.
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                {months.map(month => {
                    const isCollapsed = collapsedMonths.has(month);
                    const txs = groupedTransactions[month];
                    // Calculate net total for the month (Income - Expense)
                    const totalMonth = txs.reduce((sum, t) => sum + (t.type === 'INNTEKT' ? t.amount : -t.amount), 0);

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

                                {/* Status / Summary in Header (Visible mostly when collapsed, or always?) */}
                                {/* Let's show a subtle summary always, or just when collapsed? */}
                            </div>

                            {/* Collapsible Content */}
                            {!isCollapsed && (
                                <div className="divide-y divide-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {txs.map(tx => (
                                        <div key={tx.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 transition-colors group">
                                            {/* Date */}
                                            <div className="col-span-12 sm:col-span-2">
                                                <span className="text-sm text-gray-500">{new Date(tx.date).getDate()}. {new Date(tx.date).toLocaleString('nb-NO', { month: 'short' })}</span>
                                            </div>

                                            {/* Description and Category */}
                                            <div className="col-span-8 sm:col-span-6">
                                                <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{tx.description}</p>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 mt-1">
                                                    {tx.category}
                                                </span>
                                            </div>

                                            {/* Amount */}
                                            <div className="col-span-4 sm:col-span-4 text-right">
                                                <span className={`text-sm font-bold ${tx.type === 'INNTEKT' ? 'text-emerald-600' : 'text-gray-900'}`}>
                                                    {tx.type === 'INNTEKT' ? '+' : ''} {formatCurrency(tx.amount)}
                                                </span>
                                            </div>
                                        </div>
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
                        <span className="material-symbols-outlined text-4xl mb-2 opacity-50">receipt_long</span>
                        <p>Ingen transaksjoner funnet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
