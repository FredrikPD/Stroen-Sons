"use client";

import React, { useState, useEffect } from "react";
import { getAllTransactionsRaw, deleteTransaction, deleteAllTransactions } from "@/server/actions/finance";
import { useRouter } from "next/navigation";
import { useModal } from "@/components/providers/ModalContext";
import { LoadingState } from "@/components/ui/LoadingState";
import { SERIF, card, input } from "@/components/admin/ui";

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
            message: "Sletting kan ikke angres. Dette skjer:\n- Medlemmets saldo justeres tilbake.\n- Var transaksjonen koblet til et betalingskrav, settes kravet tilbake til «venter».\n- Var det en medlemskontingent, blir måneden markert som ubetalt igjen.",
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
            message: "Dette nullstiller hele økonomien og kan IKKE angres:\n- All transaksjonshistorikk slettes for godt.\n- Alle saldoer settes til 0.\n- Alle betalingskrav settes tilbake til «venter».\n- ALLE betalinger (også de som var registrert som betalt) markeres som ubetalt.\n\nBruk kun ved full nullstilling av systemet. Er du helt sikker?",
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

    if (loading) return <LoadingState className="h-56" />;

    return (
        <div className="space-y-6">
            <div className={`${card} flex flex-col gap-4 p-4`}>
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex flex-col md:flex-row gap-4 w-full md:items-center">
                        <div className="relative w-full md:w-96">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10">search</span>
                            <input
                                type="text"
                                placeholder="Søk..."
                                className={`${input} pl-10`}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Category Filter */}
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className={input}
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
                            className={input}
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
                        className="flex items-center gap-2 px-4 h-11 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        {deletingAll ? (
                            <div className="w-4 h-4 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
                        ) : (
                            <span className="material-symbols-outlined text-lg">delete_forever</span>
                        )}
                        Slett ALLE ({transactions.length})
                    </button>
                </div>
            </div>

            <div className={`${card} overflow-hidden`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#faf8f3] border-b border-border-color">
                            <tr>
                                <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Dato</th>
                                <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Beskrivelse</th>
                                <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Medlem</th>
                                <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Beløp</th>
                                <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Handling</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color">
                            {paginatedTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic" style={{ fontFamily: SERIF }}>
                                        Ingen transaksjoner funnet for valgte filtere.
                                    </td>
                                </tr>
                            ) : (
                                paginatedTransactions.map(tx => (
                                    <tr key={tx.id} className="group hover:bg-black/[0.02] transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap tabular-nums">
                                            {tx.date.toLocaleDateString("nb-NO")}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            {tx.description}
                                            <span className="block text-[10px] text-gray-400 font-normal">{tx.category}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                                            {tx.member ? tx.member.name : <span className="italic text-gray-400">Ingen (Felles)</span>}
                                        </td>
                                        <td className={`px-6 py-4 text-sm font-normal text-right tabular-nums ${tx.amount > 0 ? 'text-emerald-600' : 'text-gray-900'}`} style={{ fontFamily: SERIF }}>
                                            {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString("nb-NO")}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(tx.id)}
                                                disabled={deletingId === tx.id}
                                                className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-red-50 disabled:opacity-50"
                                                title="Slett"
                                            >
                                                {deletingId === tx.id ? (
                                                    <div className="w-4 h-4 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
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
                    <div className="flex items-center justify-between px-6 py-4 border-t border-border-color bg-[#faf8f3]">
                        <div className="text-sm text-gray-500 tabular-nums">
                            Viser {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredTransactions.length)} av {filteredTransactions.length}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="p-2 text-gray-600 hover:bg-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-border-color transition-all"
                            >
                                <span className="material-symbols-outlined text-lg">chevron_left</span>
                            </button>
                            <span className="text-sm font-medium text-gray-700 tabular-nums">
                                Side {currentPage} av {totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="p-2 text-gray-600 hover:bg-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-border-color transition-all"
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
