"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { getInvoiceGroupDetails, updateInvoiceGroup, getInvoiceFormData, deleteInvoiceGroup } from "@/server/actions/invoices";
import { togglePaymentStatus } from "@/server/actions/finance";
import { deletePaymentRequest } from "@/server/actions/payment-requests";
import { RequestStatus } from "@prisma/client";
import PageTitleUpdater from "@/components/layout/PageTitleUpdater";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { Toggle } from "@/components/ui/Toggle";
import { useModal } from "@/components/providers/ModalContext";

export default function InvoiceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { openConfirm, openAlert } = useModal();
    const encodedTitle = params?.title as string;
    const title = decodeURIComponent(encodedTitle);

    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    // Filter Data
    const [allMembers, setAllMembers] = useState<any[]>([]);
    const [memberSearch, setMemberSearch] = useState("");

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        description: '',
        amount: 0,
        dueDate: ''
    });
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

    useEffect(() => {
        if (!title) return;

        Promise.all([
            getInvoiceGroupDetails(title),
            getInvoiceFormData()
        ]).then(([resDetails, resForm]) => {
            if (resDetails.success && resDetails.requests) {
                setRequests(resDetails.requests);
                // Initialize form with first request data
                if (resDetails.requests.length > 0) {
                    const first = resDetails.requests[0];
                    setEditForm({
                        description: first.description || '',
                        amount: first.amount,
                        dueDate: first.dueDate ? new Date(first.dueDate).toISOString().split('T')[0] : ''
                    });
                    // Set selected members
                    setSelectedMemberIds(resDetails.requests.map((r: any) => r.memberId));
                }
            }
            if (resForm && resForm.members) {
                setAllMembers(resForm.members);
            }
            setLoading(false);
        });
    }, [title]);

    const handleSave = async () => {
        setUpdatingId('group');
        const res = await updateInvoiceGroup(title, {
            description: editForm.description,
            amount: editForm.amount,
            dueDate: editForm.dueDate ? new Date(editForm.dueDate) : undefined
        }, selectedMemberIds);

        if (res.success) {
            setIsEditing(false);
            // Reload window to refresh data cleanly or manual update
            window.location.reload();
        } else {
            await openAlert({
                title: "Feil",
                message: res.error || "Kunne ikke oppdatere gruppen.",
                type: "error"
            });
        }
        setUpdatingId(null);
    };

    const handleDeleteGroup = async () => {
        const confirmed = await openConfirm({
            title: "Slett fakturagruppe",
            message: "Er du sikker på at du vil slette denne fakturagruppen? Dette vil slette alle UBETALTE krav i gruppen.",
            type: "warning",
            confirmText: "Slett gruppe",
            cancelText: "Avbryt"
        });

        if (!confirmed) return;

        setUpdatingId('group_delete');
        const res = await deleteInvoiceGroup(title);

        if (res.success) {
            router.push("/admin/finance/invoices");
        } else {
            await openAlert({
                title: "Feil",
                message: res.error || "Kunne ikke slette gruppen.",
                type: "error"
            });
            setUpdatingId(null);
        }
    };


    const handleToggle = async (req: any) => {
        setUpdatingId(req.id);
        const res = await togglePaymentStatus(req.id);

        if (res.success) {
            // Optimistic update
            const newStatus = req.status === 'PAID' ? 'PENDING' : 'PAID';
            setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: newStatus } : r));
        } else {
            await openAlert({
                title: "Feil",
                message: res.error || "Kunne ikke endre status.",
                type: "error"
            });
        }
        setUpdatingId(null);
    };

    const handleDelete = async (req: any) => {
        const confirmed = await openConfirm({
            title: "Slett faktura",
            message: `Er du sikker på at du vil slette kravet til ${req.member.firstName}?`,
            type: "error",
            confirmText: "Slett",
            cancelText: "Avbryt"
        });

        if (!confirmed) return;

        setUpdatingId(req.id);
        const res = await deletePaymentRequest(req.id);

        if (res.success) {
            setRequests(prev => prev.filter(r => r.id !== req.id));
        } else {
            await openAlert({
                title: "Feil",
                message: res.error || "Kunne ikke slette kravet.",
                type: "error"
            });
        }
        setUpdatingId(null);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    const totalAmount = requests.reduce((sum, r) => sum + r.amount, 0);
    const paidAmount = requests.reduce((sum, r) => r.status === 'PAID' ? sum + r.amount : sum, 0);
    const paidCount = requests.filter(r => r.status === 'PAID').length;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex justify-between items-center">
                    <PageTitleUpdater title={title} backHref="/admin/finance/invoices" backLabel="Fakturaer" />
                </div>
            </div>

            {isEditing ? (
                <div className="bg-white border border-indigo-200 rounded-xl p-6 mb-6 shadow-sm ring-4 ring-indigo-50/50">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="font-bold text-lg text-gray-900">Rediger fakturadetaljer</h2>
                        <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Beskrivelse</label>
                            <input
                                type="text"
                                value={editForm.description}
                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Forfallsdato</label>
                            <input
                                type="date"
                                value={editForm.dueDate}
                                onChange={e => setEditForm({ ...editForm, dueDate: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Beløp (NOK)</label>
                            <input
                                type="number"
                                value={editForm.amount}
                                onChange={e => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Dette vil oppdatere beløpet for ALLE i denne gruppen.</p>
                        </div>
                    </div>

                    <div className="mb-6 pt-4 border-t border-gray-100">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Mottakere ({selectedMemberIds.length})</label>
                        <input
                            type="text"
                            placeholder="Søk etter medlem..."
                            value={memberSearch}
                            onChange={(e) => setMemberSearch(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 border border-gray-200 rounded-lg bg-gray-50/50">
                            {allMembers
                                .filter(m => (m.firstName + " " + m.lastName).toLowerCase().includes(memberSearch.toLowerCase()))
                                .map(m => (
                                    <label key={m.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors border ${selectedMemberIds.includes(m.id)
                                        ? 'bg-indigo-50 border-indigo-200'
                                        : 'bg-white border-gray-100 hover:border-indigo-200'
                                        }`}>
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                            checked={selectedMemberIds.includes(m.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedMemberIds([...selectedMemberIds, m.id]);
                                                else setSelectedMemberIds(selectedMemberIds.filter(id => id !== m.id));
                                            }}
                                        />
                                        <span className={`text-sm font-medium ${selectedMemberIds.includes(m.id) ? 'text-indigo-900' : 'text-gray-700'}`}>
                                            {m.firstName} {m.lastName}
                                        </span>
                                    </label>
                                ))}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2">
                            Tips: Fjerner du en person som allerede har betalt, vil fjerningen bli ignorert for sikkerhet.
                        </p>
                    </div>

                    <div className="flex justify-between pt-2">
                        <button
                            onClick={handleDeleteGroup}
                            disabled={updatingId === 'group_delete'}
                            className="px-4 py-2 text-red-600 font-medium text-sm hover:bg-red-50 rounded-lg transition flex items-center gap-2"
                        >
                            {updatingId === 'group_delete' ? "Sletter..." : (
                                <>
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                    Slett faktura
                                </>
                            )}
                        </button>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 text-gray-600 font-medium text-sm hover:bg-gray-100 rounded-lg transition"
                            >
                                Avbryt
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={updatingId === 'group'}
                                className="px-4 py-2 bg-indigo-600 text-white font-medium text-sm rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                            >
                                {updatingId === 'group' ? (
                                    <>
                                        <span className="animate-spin text-xs material-symbols-outlined">progress_activity</span>
                                        Lagrer...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-sm">save</span>
                                        Lagre endringer
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 relative group">
                    <div className="absolute top-6 right-6">
                        <Dropdown
                            trigger={
                                <button
                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
                                    title="Alternativer"
                                >
                                    <span className="material-symbols-outlined">more_vert</span>
                                </button>
                            }
                        >
                            <DropdownItem onClick={() => setIsEditing(true)}>
                                <span className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">edit</span>
                                    Rediger faktura
                                </span>
                            </DropdownItem>
                            <DropdownItem danger onClick={handleDeleteGroup}>
                                <span className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                    Slett faktura
                                </span>
                            </DropdownItem>
                        </Dropdown>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mb-1">{title}</h1>
                    <p className="text-sm text-gray-500 mb-4">
                        {paidCount} av {requests.length} har betalt.
                    </p>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-2">
                        <div
                            className="bg-indigo-500 h-2 transition-all duration-500"
                            style={{ width: `${(paidCount / requests.length) * 100}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                        <span className="text-gray-500">Innkommet: {paidAmount.toLocaleString()} kr</span>
                        <span className="text-gray-900">Totalt: {totalAmount.toLocaleString()} kr</span>
                    </div>
                </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-widest text-left">
                        <tr>
                            <th className="px-6 py-4 text-left">Medlem</th>
                            <th className="px-6 py-4 w-32 text-left">Beløp</th>
                            <th className="px-6 py-4 w-32 text-left">Status</th>
                            <th className="px-6 py-4 w-48 text-right">Handling</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {requests.map((req) => (
                            <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">
                                        {req.member.firstName} {req.member.lastName}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        Forfall: {req.dueDate ? new Date(req.dueDate).toLocaleDateString() : 'Ingen'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-mono text-sm text-gray-600">
                                    {req.amount},-
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${req.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                        {req.status === 'PAID' ? 'Betalt' : 'Ubetalt'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-3">
                                        <div className="flex items-center gap-2">
                                            <Toggle
                                                checked={req.status === 'PAID'}
                                                onChange={() => handleToggle(req)}
                                                disabled={updatingId === req.id}
                                                loading={updatingId === req.id}
                                            />
                                            <span className={`text-sm font-medium w-14 text-center inline-block ${req.status === 'PAID' ? 'text-gray-900' : 'text-gray-500'}`}>
                                                {req.status === 'PAID' ? 'Betalt' : 'Ubetalt'}
                                            </span>
                                        </div>


                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
