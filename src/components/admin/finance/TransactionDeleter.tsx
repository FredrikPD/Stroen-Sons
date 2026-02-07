"use client";

import React, { useState, useEffect } from "react";
import { getAllTransactions, deleteTransaction, deleteAllTransactions } from "@/server/actions/finance";
import { useRouter } from "next/navigation";
import { useModal } from "@/components/providers/ModalContext";

type Transaction = {
    id: string;
    date: Date;
    description: string;
    category: string;
    type: string;
    amount: number;
    members: string[]; // Names
};

export function TransactionDeleter() {
    const { openConfirm, openAlert } = useModal();
    const router = useRouter();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deletingAll, setDeletingAll] = useState(false);

    useEffect(() => {
        loadTransactions();
    }, []);

    const loadTransactions = async () => {
        setLoading(true);
        const res = await getAllTransactions();
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
            message: "Er du sikker på at du vil slette denne transaksjonen? Dette vil reversere saldo-endringen på medlemmene.",
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
        // Double confirmation for safety
        const confirmed = await openConfirm({
            title: "SLETT ALLE TRANSAKSJONER?",
            message: "ADVARSEL: Dette vil slette ALLE transaksjoner i systemet og nullstille alles saldo til 0. Dette kan IKKE angres. Er du helt sikker?",
            type: "error",
            confirmText: "JA, SLETT ALT"
        });

        if (!confirmed) return;

        // Extra input confirmation handled by simple prompt for now, or just trust the dangerous confirm dialog.
        // The modal context might not support inputs, so we rely on the big warning.
        // Let's rely on the "danger" type modal which usually is red.

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

    const filteredTransactions = transactions.filter(t =>
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.members.some(m => m.toLowerCase().includes(search.toLowerCase())) ||
        t.category.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center text-gray-500">Laster transaksjoner...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="relative w-full md:w-96">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                    <input
                        type="text"
                        placeholder="Søk etter beskrivelse eller medlem..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <button
                    onClick={handleDeleteAll}
                    disabled={deletingAll || transactions.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {deletingAll ? (
                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <span className="material-symbols-outlined text-lg">delete_forever</span>
                    )}
                    Slett ALLE ({transactions.length})
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Dato</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Beskrivelse</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Medlemmer</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Beløp</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Handling</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">
                                        Ingen transaksjoner funnet.
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map(tx => (
                                    <tr key={tx.id} className="group hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                            {tx.date.toLocaleDateString("nb-NO")}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            {tx.description}
                                            <span className="block text-[10px] text-gray-400 font-normal">{tx.category}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={tx.members.join(", ")}>
                                            {tx.members.length > 0 ? tx.members.join(", ") : <span className="italic text-gray-400">Ingen (Felles)</span>}
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
            </div>
        </div>
    );
}
