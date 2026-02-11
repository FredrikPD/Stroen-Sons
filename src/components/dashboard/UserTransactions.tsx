"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

type Transaction = {
    id: string;
    date: Date;
    description: string;
    category: string;
    amount: number;
};

export function UserTransactions({ transactions }: { transactions: Transaction[] }) {
    // State to track which years are collapsed.
    const [collapsedYears, setCollapsedYears] = useState<Set<string>>(new Set());

    // Group transactions by Year
    const groupedTransactions = transactions.reduce((acc, tx) => {
        const year = new Date(tx.date).getFullYear().toString();

        if (!acc[year]) {
            acc[year] = [];
        }
        acc[year].push(tx);
        return acc;
    }, {} as Record<string, Transaction[]>);

    // Get list of years (keys) sorted descending
    const years = Object.keys(groupedTransactions).sort((a, b) => Number(b) - Number(a));

    useEffect(() => {
        // Initialize Collapsed State
        // First year OPEN, others CLOSED
        const initialCollapsed = new Set<string>();
        years.slice(1).forEach(y => initialCollapsed.add(y));
        setCollapsedYears(initialCollapsed);
    }, [transactions]); // Re-run if transactions change (though usually static from server)

    const toggleYear = (year: string) => {
        const newCollapsed = new Set(collapsedYears);
        if (newCollapsed.has(year)) {
            newCollapsed.delete(year); // Open
        } else {
            newCollapsed.add(year); // Close
        }
        setCollapsedYears(newCollapsed);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(amount);
    };

    return (
        <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Transaksjoner</h4>
            <div className="space-y-3">
                {years.length > 0 ? (
                    years.map(year => {
                        const isCollapsed = collapsedYears.has(year);
                        const txs = groupedTransactions[year];
                        const totalYear = txs.reduce((sum, t) => sum + t.amount, 0);

                        return (
                            <div key={year} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-all duration-200">
                                {/* Clickable Header */}
                                <div
                                    onClick={() => toggleYear(year)}
                                    className="bg-gray-50/80 backdrop-blur-sm px-4 py-3 border-b border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors group select-none"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={`material-symbols-outlined text-gray-400 text-xl transition-transform duration-300 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}>
                                            expand_more
                                        </span>
                                        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest">{year}</h2>
                                    </div>

                                    <div className="text-sm font-medium text-gray-500">
                                        {isCollapsed && (
                                            <span className={totalYear >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                                                {totalYear > 0 ? '+' : ''}{formatCurrency(totalYear)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Collapsible Content */}
                                {!isCollapsed && (
                                    <div className="divide-y divide-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                        {txs.map(tx => {
                                            const isPositive = Number(tx.amount) > 0;
                                            return (
                                                <Link key={tx.id} href={`/balance/transactions/${tx.id}`} className="flex items-center justify-between text-sm group px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                            <span className="material-symbols-outlined text-sm">
                                                                {isPositive ? "arrow_upward" : "arrow_downward"}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="font-semibold text-gray-900 group-hover:text-[#4F46E5] transition-colors truncate" title={tx.description}>
                                                                {tx.description}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400">
                                                                {new Date(tx.date).toLocaleDateString("nb-NO", { day: 'numeric', month: 'short' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-mono font-bold whitespace-nowrap ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                                                            {isPositive ? "+" : ""}
                                                            {formatCurrency(Number(tx.amount))}
                                                        </span>
                                                        <span className="material-symbols-outlined text-gray-300 text-base opacity-0 group-hover:opacity-100 transition-opacity">
                                                            chevron_right
                                                        </span>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                        {/* Year Footer Summary */}
                                        <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex justify-end items-center text-sm font-medium text-gray-500">
                                            Årstotal: <span className={`ml-1 font-bold ${totalYear >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {totalYear > 0 ? '+' : ''}{formatCurrency(totalYear)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <p className="text-xs text-gray-400 italic">Ingen transaksjoner funnet.</p>
                )}
            </div>
        </div>
    );
}
