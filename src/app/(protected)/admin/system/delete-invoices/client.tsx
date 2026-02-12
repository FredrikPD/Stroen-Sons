"use client";

import { useState, useCallback, useEffect } from "react";
import { getInvoices, deleteMultipleInvoices } from "@/server/actions/invoices";
import { RequestStatus } from "@prisma/client";
import { useModal } from "@/components/providers/ModalContext";
import PageTitleUpdater from "@/components/layout/PageTitleUpdater";


// Simple debounce implementation if hook missing
function useDebounceValue<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

interface Props {
    members: { id: string; firstName: string | null; lastName: string | null }[];
}

export default function InvoiceDeleteClient({ members }: Props) {
    const { openConfirm, openAlert } = useModal();
    const formatNok = (amount: number) =>
        new Intl.NumberFormat("nb-NO", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);

    // Filters
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounceValue(search, 500);
    const [statusFilter, setStatusFilter] = useState<RequestStatus | "ALL">("ALL");
    const [memberFilter, setMemberFilter] = useState<string>("ALL");

    // Data
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Selection
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [deleting, setDeleting] = useState(false);

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        const res = await getInvoices({
            search: debouncedSearch,
            status: statusFilter === "ALL" ? undefined : statusFilter,
            memberId: memberFilter === "ALL" ? undefined : memberFilter
        });

        if (res.success && res.requests) {
            setInvoices(res.requests);
            // Clear selection if items no longer exist or safe reset
            setSelectedIds([]);
        }
        setLoading(false);
    }, [debouncedSearch, statusFilter, memberFilter]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            // Only select pending invoices? Or allowed to select paid (but deletion will fail)?
            // Better UX: Allow selection, let backend reject. Or disable checkbox for paid.
            // Let's optimize: Only select PENDING invoices for now to avoid frustration.
            const pendingIds = invoices.filter(i => i.status !== 'PAID').map(i => i.id);
            setSelectedIds(pendingIds);
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(i => i !== id));
        } else {
            setSelectedIds(prev => [...prev, id]);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;

        const confirmed = await openConfirm({
            title: `Slett ${selectedIds.length} fakturaer`,
            message: "Er du sikker på at du vil slette disse fakturaene? Dette kan ikke angres.",
            type: "error",
            confirmText: "Slett",
            cancelText: "Avbryt"
        });

        if (!confirmed) return;

        setDeleting(true);
        const res = await deleteMultipleInvoices(selectedIds);

        if (res.success) {
            await openAlert({
                title: "Suksess",
                message: `Slettet ${res.count} fakturaer.`,
                type: "success"
            });
            fetchInvoices();
        } else {
            await openAlert({
                title: "Feil",
                message: res.error || "Kunne ikke slette fakturaer.",
                type: "error"
            });
        }
        setDeleting(false);
    };

    return (
        <div className="space-y-6">
            <PageTitleUpdater title="Slett Fakturaer" backHref="/admin/system" backLabel="System" />

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Slett Fakturaer</h1>
                <p className="text-gray-500 text-sm">Søk og filtrer for å finne fakturaer du vil slette i bulk.</p>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Søk</label>
                    <input
                        type="text"
                        placeholder="Tittel, beskrivelse eller navn..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="w-full md:w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                        <option value="ALL">Alle</option>
                        <option value="PENDING">Ubetalt</option>
                        <option value="PAID">Betalt</option>
                        <option value="WAIVED">Ettergitt</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Medlem</label>
                    <select
                        value={memberFilter}
                        onChange={(e) => setMemberFilter(e.target.value)}
                        className="w-full md:w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                        <option value="ALL">Alle medlemmer</option>
                        {members.map(m => (
                            <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Actions Bar */}
            {selectedIds.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex justify-between items-center animate-in fade-in slide-in-from-top-2">
                    <span className="text-indigo-900 font-medium text-sm">
                        {selectedIds.length} fakturaer valgt
                    </span>
                    <button
                        onClick={handleDeleteSelected}
                        disabled={deleting}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 transition flex items-center gap-2"
                    >
                        {deleting ? 'Sletter...' : 'Slett valgte'}
                        <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-widest text-left">
                            <tr>
                                <th className="px-6 py-4 w-10">
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={invoices.length > 0 && selectedIds.length === invoices.filter(i => i.status !== 'PAID').length && invoices.some(i => i.status !== 'PAID')}
                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                    />
                                </th>
                                <th className="px-6 py-4">Faktura</th>
                                <th className="px-6 py-4">Medlem</th>
                                <th className="px-6 py-4">Beløp</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Opprettet</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#4F46E5]/25 border-t-[#4F46E5]"></div>
                                    </td>
                                </tr>
                            ) : invoices.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic">
                                        Ingen fakturaer funnet.
                                    </td>
                                </tr>
                            ) : (
                                invoices.map((inv) => (
                                    <tr key={inv.id} className={`hover:bg-gray-50/50 transition-colors ${selectedIds.includes(inv.id) ? 'bg-indigo-50/30' : ''}`}>
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(inv.id)}
                                                onChange={() => handleSelectOne(inv.id)}
                                                disabled={inv.status === 'PAID'}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 disabled:opacity-50"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{inv.title}</div>
                                            <div className="text-xs text-gray-500 truncate max-w-[200px]">{inv.description}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {inv.member.firstName} {inv.member.lastName}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-sm text-gray-600">
                                            {formatNok(Number(inv.amount))} kr
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                                                inv.status === 'WAIVED' ? 'bg-gray-100 text-gray-800' :
                                                    'bg-amber-100 text-amber-800'
                                                }`}>
                                                {inv.status === 'PAID' ? 'Betalt' : inv.status === 'WAIVED' ? 'Ettergitt' : 'Ubetalt'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-gray-500">
                                            {new Date(inv.createdAt).toLocaleDateString()}
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
