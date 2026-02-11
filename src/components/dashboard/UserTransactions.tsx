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
    const [collapsedYears, setCollapsedYears] = useState<Set<string>>(new Set());
    const [filter, setFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');

    // Group transactions by month within year
    const groupedByMonth = transactions
        .filter(tx => {
            if (filter === 'ALL') return true;
            if (filter === 'INCOME') return tx.amount > 0;
            return tx.amount < 0;
        })
        .reduce((acc, tx) => {
            const d = new Date(tx.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(tx);
            return acc;
        }, {} as Record<string, Transaction[]>);

    // Sort month keys descending
    const monthKeys = Object.keys(groupedByMonth).sort((a, b) => b.localeCompare(a));

    // Group month keys by year
    const yearGroups = monthKeys.reduce((acc, key) => {
        const year = key.split('-')[0];
        if (!acc[year]) acc[year] = [];
        acc[year].push(key);
        return acc;
    }, {} as Record<string, string[]>);

    const years = Object.keys(yearGroups).sort((a, b) => Number(b) - Number(a));

    useEffect(() => {
        // Collapse all years except the first
        const initialCollapsed = new Set<string>();
        years.slice(1).forEach(y => initialCollapsed.add(y));
        setCollapsedYears(initialCollapsed);
    }, [transactions]);

    const toggleYear = (year: string) => {
        const next = new Set(collapsedYears);
        if (next.has(year)) next.delete(year);
        else next.add(year);
        setCollapsedYears(next);
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 2 }).format(amount);

    const getMonthName = (key: string) => {
        const [y, m] = key.split('-');
        const d = new Date(Number(y), Number(m) - 1);
        const name = d.toLocaleString('nb-NO', { month: 'long' });
        return name.charAt(0).toUpperCase() + name.slice(1);
    };

    // Summary stats
    const totalIncome = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0);

    return (
        <div className="space-y-5">
            {/* Section Header  */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h3 className="text-2xl font-bold text-gray-900">Transaksjoner</h3>
                    <p className="text-sm text-gray-400 mt-0.5">Oversikt over alle dine bevegelser</p>
                </div>

                {/* Filter Pills */}
                <div className="bg-gray-100 p-1 rounded-lg flex text-xs font-medium">
                    <button
                        onClick={() => setFilter('ALL')}
                        className={`px-3 py-1.5 rounded-md transition-all ${filter === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Alle
                    </button>
                    <button
                        onClick={() => setFilter('INCOME')}
                        className={`px-3 py-1.5 rounded-md transition-all ${filter === 'INCOME' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Innbetalinger
                    </button>
                    <button
                        onClick={() => setFilter('EXPENSE')}
                        className={`px-3 py-1.5 rounded-md transition-all ${filter === 'EXPENSE' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Utgifter
                    </button>
                </div>
            </div>

            {/* Timeline */}
            {years.length > 0 ? (
                <div className="space-y-8">
                    {years.map(year => {
                        const isCollapsed = collapsedYears.has(year);
                        const yearTxs = yearGroups[year].flatMap(k => groupedByMonth[k]);
                        const yearTotal = yearTxs.reduce((s, t) => s + t.amount, 0);

                        return (
                            <div key={year} className="relative">
                                {/* Year Header */}
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="h-px flex-1 bg-gray-200"></div>
                                    <button
                                        onClick={() => toggleYear(year)}
                                        className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors group cursor-pointer border border-gray-200"
                                    >
                                        <h4 className="text-sm font-bold text-gray-800">{year}</h4>
                                        <span className={`material-symbols-outlined text-gray-400 text-lg transition-transform duration-300 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}>
                                            expand_more
                                        </span>
                                    </button>
                                    <div className="h-px flex-1 bg-gray-200"></div>
                                </div>

                                {/* Collapsed Summary */}
                                {isCollapsed && (
                                    <div className="text-center text-xs font-medium text-gray-500 mb-2">
                                        {yearTxs.length} transaksjoner totalt <span className={yearTotal >= 0 ? 'text-emerald-600 font-bold ml-1' : 'text-red-600 font-bold ml-1'}>{formatCurrency(yearTotal)}</span>
                                    </div>
                                )}

                                {/* Months */}
                                {!isCollapsed && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                        {yearGroups[year].map(monthKey => {
                                            const txs = groupedByMonth[monthKey];
                                            const monthTotal = txs.reduce((s, t) => s + t.amount, 0);

                                            return (
                                                <div key={monthKey} className="relative pl-4 border-l-2 border-gray-100 ml-4">
                                                    {/* Month Timeline Dot */}
                                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-gray-200"></div>

                                                    {/* Month Label */}
                                                    <div className="flex items-center justify-between mb-3 pl-2">
                                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                                            {getMonthName(monthKey)}
                                                        </span>
                                                        <span className={`text-xs font-bold ${monthTotal >= 0 ? 'text-emerald-600' : 'text-red-500'} bg-gray-50 px-2 py-0.5 rounded`}>
                                                            {formatCurrency(monthTotal)}
                                                        </span>
                                                    </div>

                                                    {/* Transaction Cards */}
                                                    <div className="flex flex-col">
                                                        {txs.map((tx, index) => {
                                                            const isPositive = tx.amount > 0;
                                                            const isFirst = index === 0;
                                                            const isLast = index === txs.length - 1;

                                                            return (
                                                                <Link
                                                                    key={tx.id}
                                                                    href={`/balance/transactions/${tx.id}`}
                                                                    className={`flex items-center gap-4 px-4 py-4 bg-white border border-gray-200 hover:border-indigo-300 hover:bg-gray-50/50 hover:z-10 relative transition-all group cursor-pointer
                                                                        ${isFirst ? 'rounded-t-2xl' : ''}
                                                                        ${isLast ? 'rounded-b-2xl' : ''}
                                                                        ${!isFirst ? '-mt-px' : ''}
                                                                    `}
                                                                >
                                                                    {/* Icon */}
                                                                    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${isPositive
                                                                        ? 'bg-emerald-100 text-emerald-600'
                                                                        : 'bg-red-100 text-red-600'
                                                                        }`}>
                                                                        <span className="material-symbols-outlined text-[1.25rem]">
                                                                            {isPositive ? "arrow_upward" : "arrow_downward"}
                                                                        </span>
                                                                    </div>

                                                                    {/* Details */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                                                                            {tx.description}
                                                                        </p>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <span className="text-xs text-gray-500">
                                                                                {new Date(tx.date).toLocaleDateString("nb-NO", { day: 'numeric', month: 'long' })}
                                                                            </span>
                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-500">
                                                                                {tx.category}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Amount + Chevron */}
                                                                    <div className="flex items-center gap-3 flex-shrink-0">
                                                                        <span className={`text-base font-bold tabular-nums ${isPositive ? 'text-emerald-700' : 'text-gray-900'}`}>
                                                                            {isPositive ? "+" : ""}{formatCurrency(tx.amount)}
                                                                        </span>
                                                                        <div className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-indigo-50 flex items-center justify-center transition-colors">
                                                                            <span className="material-symbols-outlined text-gray-400 group-hover:text-indigo-500 text-sm transition-colors">
                                                                                chevron_right
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </Link>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-12">
                    <span className="material-symbols-outlined text-3xl text-gray-200 mb-2">receipt_long</span>
                    <p className="text-sm text-gray-400">Ingen transaksjoner funnet.</p>
                </div>
            )}
        </div>
    );
}
