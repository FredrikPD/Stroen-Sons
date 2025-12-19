"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getInvoiceGroupDetails } from "@/server/actions/invoices";
import { togglePaymentStatus } from "@/server/actions/finance";
import { RequestStatus } from "@prisma/client";

export default function InvoiceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const encodedTitle = params?.title as string;
    const title = decodeURIComponent(encodedTitle);

    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        if (!title) return;
        getInvoiceGroupDetails(title).then(res => {
            if (res.success && res.requests) {
                setRequests(res.requests);
            }
            setLoading(false);
        });
    }, [title]);


    const handleToggle = async (req: any) => {
        setUpdatingId(req.id);
        const res = await togglePaymentStatus(req.id);

        if (res.success) {
            // Optimistic update
            const newStatus = req.status === 'PAID' ? 'PENDING' : 'PAID';
            setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: newStatus } : r));
        } else {
            alert("Feil: " + res.error);
        }
        setUpdatingId(null);
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Laster...</div>;

    const totalAmount = requests.reduce((sum, r) => sum + r.amount, 0);
    const paidAmount = requests.reduce((sum, r) => r.status === 'PAID' ? sum + r.amount : sum, 0);
    const paidCount = requests.filter(r => r.status === 'PAID').length;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Link href="/admin/finance/invoices" className="inline-flex items-center text-gray-500 hover:text-gray-900 transition-colors font-medium text-sm">
                    <span className="material-symbols-outlined mr-1 text-[1.2rem]">arrow_back</span>
                    Tilbake
                </Link>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
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

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-widest text-left">
                        <tr>
                            <th className="px-6 py-4">Medlem</th>
                            <th className="px-6 py-4">Beløp</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Handling</th>
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
                                    <button
                                        onClick={() => handleToggle(req)}
                                        disabled={updatingId === req.id}
                                        className={`text-sm font-bold transition-colors ${req.status === 'PAID'
                                                ? 'text-gray-400 hover:text-red-600'
                                                : 'text-emerald-600 hover:text-emerald-700'
                                            }`}
                                    >
                                        {updatingId === req.id ? 'Lagrer...' : (req.status === 'PAID' ? 'Merk som ubetalt' : 'Registrer betaling')}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
