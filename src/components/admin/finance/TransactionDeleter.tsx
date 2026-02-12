"use client";

import React, { useState, useEffect } from "react";
import { getAllTransactionsRaw, deleteTransaction, deleteAllTransactions } from "@/server/actions/finance";
import { useRouter } from "next/navigation";
import { useModal } from "@/components/providers/ModalContext";

type Transaction = {
    id: string;
    date: Date;
    description: string;
    category: string;
    type: string;
    amount: number;
    member: {
        id: string;
        name: string;
    } | null;
};

export function TransactionDeleter() {
    const { openConfirm, openAlert } = useModal();
    const router = useRouter();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [memberFilter, setMemberFilter] = useState("ALL");
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deletingAll, setDeletingAll] = useState(false);

    useEffect(() => {
        loadTransactions();
    }, []);

    const loadTransactions = async () => {
        setLoading(true);
        const res = await getAllTransactionsRaw();
        if (res.success && res.transactions) {
            setTransactions(res.transactions.map((t: any) => ({
                ...t,
                date: new Date(t.date)
            })));
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        const confirmed = await openConfirm({
            title: "Slett Transaksjon",
            message: "Er du sikker på at du vil slette denne transaksjonen? Dette vil reversere saldo-endringen på medlemmet.",
            type: "warning",
            confirmText: "Slett"
        });

        if (!confirmed) return;

        setDeletingId(id);
        const res = await deleteTransaction(id);
        if (res.success) {
            setTransactions(prev => prev.filter(t => t.id !== id));
            router.refresh();
        } else {
            await openAlert({
                title: "Feil",
                message: res.error || "Kunne ikke slette transaksjon.",
                type: "error"
            });
        }
        setDeletingId(null);
    };

    const handleDeleteAll = async () => {
        const confirmed = await openConfirm({
            title: "SLETT ALLE TRANSAKSJONER?",
            message: "ADVARSEL: Dette vil slette ALLE transaksjoner i systemet og nullstille alles saldo til 0. Dette kan IKKE angres. Er du helt sikker?",
            type: "error",
            confirmText: "JA, SLETT ALT"
        });

        if (!confirmed) return;

        setDeletingAll(true);
        const res = await deleteAllTransactions();
        if (res.success) {
            setTransactions([]);
            router.refresh();
            await openAlert({
                title: "Slettet",
                message: "Alle transaksjoner er slettet og saldoer nullstilt.",
                type: "success"
            });
        } else {
            await openAlert({
                title: "Feil",
                message: res.error || "Kunne ikke slette alt.",
                type: "error"
            });
        }
        setDeletingAll(false);
    };

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, categoryFilter, memberFilter]);

    // Derived lists for filters
    const categories = Array.from(new Set(transactions.map(t => t.category))).sort();
    const members = Array.from(new Set(transactions.filter(t => t.member).map(t => t.member!.name))).sort();

    const filteredTransactions = transactions.filter(t => {
        const matchesSearch =
            t.description.toLowerCase().includes(search.toLowerCase()) ||
            (t.member?.name.toLowerCase().includes(search.toLowerCase()) ?? false) ||
            t.category.toLowerCase().includes(search.toLowerCase());

        const matchesCategory = categoryFilter === "ALL" || t.category === categoryFilter;
        const matchesMember = memberFilter === "ALL" || (t.member?.name === memberFilter);

        return matchesSearch && matchesCategory && matchesMember;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Laster transaksjoner...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex flex-col md:flex-row gap-4 w-full md:items-center">
                        <div className="relative w-full md:w-96">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                            <input
                                type="text"
                                placeholder="Søk..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Category Filter */}
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 hover:bg-white focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                        >
                            <option value="ALL">Alle Kategorier</option>
                            {categories.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>

                        {/* Member Filter */}
                        <select
                            value={memberFilter}
                            onChange={(e) => setMemberFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 hover:bg-white focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                        >
                            <option value="ALL">Alle Medlemmer</option>
                            {members.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleDeleteAll}
                        disabled={deletingAll || transactions.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        {deletingAll ? (
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <span className="material-symbols-outlined text-lg">delete_forever</span>
                        )}
                        Slett ALLE ({transactions.length})
                    </button>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Dato</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Beskrivelse</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Medlem</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Beløp</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Handling</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {paginatedTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">
                                        Ingen transaksjoner funnet for valgte filtere.
                                    </td>
                                </tr>
                            ) : (
                                paginatedTransactions.map(tx => (
                                    <tr key={tx.id} className="group hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                            {tx.date.toLocaleDateString("nb-NO")}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            {tx.description}
                                            <span className="block text-[10px] text-gray-400 font-normal">{tx.category}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                                            {tx.member ? tx.member.name : <span className="italic text-gray-400">Ingen (Felles)</span>}
                                        </td>
                                        <td className={`px-6 py-4 text-sm font-bold text-right tabular-nums ${tx.amount > 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                                            {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString("nb-NO")}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(tx.id)}
                                                disabled={deletingId === tx.id}
                                                className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50 disabled:opacity-50"
                                                title="Slett"
                                            >
                                                {deletingId === tx.id ? (
                                                    <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {filteredTransactions.length > itemsPerPage && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
                        <div className="text-sm text-gray-500">
                            Viser {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredTransactions.length)} av {filteredTransactions.length}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="p-2 text-gray-600 hover:bg-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-gray-200 transition-all"
                            >
                                <span className="material-symbols-outlined text-lg">chevron_left</span>
                            </button>
                            <span className="text-sm font-medium text-gray-700">
                                Side {currentPage} av {totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="p-2 text-gray-600 hover:bg-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-gray-200 transition-all"
                            >
                                <span className="material-symbols-outlined text-lg">chevron_right</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
