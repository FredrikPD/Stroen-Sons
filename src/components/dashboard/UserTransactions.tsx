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

    const monthKeys = Object.keys(groupedByMonth).sort((a, b) => b.localeCompare(a));

    const yearGroups = monthKeys.reduce((acc, key) => {
        const year = key.split('-')[0];
        if (!acc[year]) acc[year] = [];
        acc[year].push(key);
        return acc;
    }, {} as Record<string, string[]>);

    const years = Object.keys(yearGroups).sort((a, b) => Number(b) - Number(a));

    useEffect(() => {
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
        new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(amount);

    const formatCategory = (category: string) => {
        const normalized = category.toUpperCase();
        if (normalized === "MEMBERSHIP_FEE") return "Kontingent";
        if (normalized === "EVENT_FEE") return "Arrangement";
        if (normalized === "OTHER") return "Annet";
        return category.replace(/_/g, " ");
    };

    const getMonthName = (key: string) => {
        const [y, m] = key.split('-');
        const d = new Date(Number(y), Number(m) - 1);
        const name = d.toLocaleString('nb-NO', { month: 'long' });
        return name.charAt(0).toUpperCase() + name.slice(1);
    };

    return (
        <div className="space-y-6">

            {/* Filter */}
            <div className="flex items-center gap-1">
                {(['ALL', 'INCOME', 'EXPENSE'] as const).map((f, i) => {
                    const labels = { ALL: 'Alle', INCOME: 'Innbetalinger', EXPENSE: 'Utgifter' };
                    const active = filter === f;
                    return (
                        <React.Fragment key={f}>
                            {i > 0 && <span className="text-gray-200 text-xs select-none">·</span>}
                            <button
                                onClick={() => setFilter(f)}
                                className={`text-[11px] font-bold uppercase tracking-[0.15em] px-2 py-1 transition-colors cursor-pointer border-b-2 ${
                                    active ? 'text-gray-900 border-gray-900' : 'text-gray-400 hover:text-gray-600 border-transparent'
                                }`}
                            >
                                {labels[f]}
                            </button>
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Content */}
            {years.length > 0 ? (
                <div className="space-y-8">
                    {years.map(year => {
                        const isCollapsed = collapsedYears.has(year);
                        const yearTxs = yearGroups[year].flatMap(k => groupedByMonth[k]);
                        const yearTotal = yearTxs.reduce((s, t) => s + t.amount, 0);

                        return (
                            <div key={year}>
                                {/* Year separator */}
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="h-px flex-1 bg-gray-100" />
                                    <button
                                        onClick={() => toggleYear(year)}
                                        className="flex items-center gap-1.5 cursor-pointer group"
                                    >
                                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 group-hover:text-gray-600 transition-colors">
                                            {year}
                                        </span>
                                        <span className={`material-symbols-outlined text-gray-300 group-hover:text-gray-500 transition-all duration-200 text-sm leading-none ${isCollapsed ? '-rotate-90' : ''}`}>
                                            expand_more
                                        </span>
                                    </button>
                                    <div className="h-px flex-1 bg-gray-100" />
                                </div>

                                {isCollapsed ? (
                                    <p className="text-center text-xs text-gray-400 pb-1">
                                        {yearTxs.length} transaksjoner —{' '}
                                        <span
                                            className={yearTotal >= 0 ? 'text-emerald-600' : 'text-gray-600'}
                                            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                                        >
                                            {formatCurrency(yearTotal)}
                                        </span>
                                    </p>
                                ) : (
                                    <div className="space-y-5">
                                        {yearGroups[year].map(monthKey => {
                                            const txs = groupedByMonth[monthKey];
                                            const monthTotal = txs.reduce((s, t) => s + t.amount, 0);

                                            return (
                                                <div key={monthKey}>
                                                    {/* Month header */}
                                                    <div className="flex items-center justify-between mb-2 px-0.5">
                                                        <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">
                                                            {getMonthName(monthKey)}
                                                        </span>
                                                        <span
                                                            className={`text-xs tabular-nums ${monthTotal >= 0 ? 'text-emerald-600' : 'text-gray-500'}`}
                                                            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                                                        >
                                                            {monthTotal >= 0 ? '+' : ''}{formatCurrency(monthTotal)}
                                                        </span>
                                                    </div>

                                                    {/* Row group */}
                                                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                                        {txs.map((tx, index) => {
                                                            const isPositive = tx.amount > 0;
                                                            const isLast = index === txs.length - 1;

                                                            return (
                                                                <Link
                                                                    key={tx.id}
                                                                    href={`/balance/transactions/${tx.id}`}
                                                                    className={`flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors group relative ${
                                                                        !isLast ? 'border-b border-gray-100' : ''
                                                                    }`}
                                                                >
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm text-gray-800 leading-tight truncate group-hover:text-gray-900 transition-colors">
                                                                            {tx.description}
                                                                        </p>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <span className="text-[10px] text-gray-400">
                                                                                {new Date(tx.date).toLocaleDateString("nb-NO", { day: 'numeric', month: 'short' })}
                                                                            </span>
                                                                            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-300">
                                                                                {formatCategory(tx.category)}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                                        <span
                                                                            className={`text-base tabular-nums font-normal ${isPositive ? 'text-emerald-600' : 'text-gray-900'}`}
                                                                            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                                                                        >
                                                                            {isPositive ? '+' : ''}{formatCurrency(tx.amount)}
                                                                        </span>
                                                                        <span className="material-symbols-outlined text-gray-300 text-base leading-none group-hover:text-gray-400 transition-colors">
                                                                            chevron_right
                                                                        </span>
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
                <div className="text-center py-12 flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-3xl text-gray-200">receipt_long</span>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-300">Ingen transaksjoner</p>
                </div>
            )}
        </div>
    );
}
