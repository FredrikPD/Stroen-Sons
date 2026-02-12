"use client";

import React from "react";
import { RequestStatus } from "@prisma/client";
import Link from "next/link";

type Invoice = {
    id: string;
    title: string;
    amount: number;
    dueDate: string | null;
    status: RequestStatus;
    category: string;
};

export function MyInvoices({ invoices, className = "", limit }: { invoices: Invoice[], className?: string, limit?: number }) {
    // Sort: Unpaid (Overdue first), then Paid (Newest first)
    const sortedInvoices = [...invoices].sort((a, b) => {
        if (a.status !== b.status) {
            return a.status === 'PENDING' ? -1 : 1;
        }
        // If both pending, overdue/due date asc
        if (a.status === 'PENDING') {
            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
            return dateA - dateB;
        }
        // If both paid, likely want newest first? Or maybe logic depends on updated date which we don't strictly have here (only dueDate)
        // Let's use ID/created implicitly or dueDate desc
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        return dateB - dateA;
    });

    const pendingCount = invoices.filter(i => i.status === 'PENDING').length;

    if (invoices.length === 0) {
        return (
            <div className={`bg-white border border-gray-200 rounded-xl p-8 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden ${className}`}>
                {/* ... (empty state same as before) ... */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 to-transparent pointer-events-none" />
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
                    <span className="material-symbols-outlined text-3xl">task_alt</span>
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">Ingen fakturaer</h3>
                <p className="text-gray-500 text-sm max-w-[250px]">
                    Du har ingen ubetaltefakturaer.
                </p>
            </div>
        );
    }

    return (
        <div className={`bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow ${className}`}>
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />

            {/* Decorative Background Icon */}
            <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none">
                <span className="material-symbols-outlined text-[10rem] text-blue-500">receipt_long</span>
            </div>

            <div className="flex flex-col h-full relative z-10">
                <div className="flex items-center justify-between mb-4 flex-none">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-blue-50 rounded-md flex items-center justify-center text-blue-600">
                            <span className="material-symbols-outlined text-[1.1rem]">receipt_long</span>
                        </div>
                        <h3 className="font-bold text-gray-900 text-base">Mine Fakturaer</h3>
                    </div>

                    <div className="flex items-center gap-2">
                        {pendingCount > 0 && (
                            <div className="bg-[#FFF8E1] text-[#785900] text-[10px] uppercase tracking-wide font-bold px-2.5 py-1 rounded-full border border-[#FFE082]/30">
                                {pendingCount} til forfall
                            </div>
                        )}
                        <Link href="/invoices" className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline">
                            Se alle
                        </Link>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pr-1 -mr-1 space-y-3 custom-scrollbar">
                    <div className="space-y-3">
                        {sortedInvoices.slice(0, limit).map((inv) => {
                            const isPaid = inv.status === 'PAID';
                            const isOverdue = !isPaid && inv.dueDate && new Date(inv.dueDate) < new Date();
                            const dueDateDisplay = inv.dueDate
                                ? new Date(inv.dueDate).toLocaleDateString('no-NO')
                                : 'Ingen frist';

                            return (
                                <Link
                                    href={`/invoices/${inv.id}`}
                                    key={inv.id}
                                    className={`
                                        block border p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all backdrop-blur-sm group/item
                                        ${isPaid
                                            ? "bg-gray-50/50 border-gray-100 hover:bg-gray-50 hover:border-gray-300 opacity-75 hover:opacity-100"
                                            : "bg-white/60 border-gray-200 hover:bg-white hover:border-blue-300 hover:shadow-md"
                                        }
                                    `}
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className={`font-bold text-xs transition-colors ${isPaid ? "text-gray-600" : "text-gray-900 group-hover/item:text-blue-600"}`}>
                                                {inv.title}
                                            </p>
                                            {isPaid && (
                                                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                                                    BETALT
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-2">
                                            <span>#{inv.id.slice(-4).toUpperCase()}</span>
                                            <span className="hidden md:inline text-gray-300">•</span>
                                            <span className={isOverdue ? "text-red-600 font-medium" : "text-gray-500"}>
                                                {isPaid ? "Betalt" : `Forfall: ${dueDateDisplay}`}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto mt-1 md:mt-0">
                                        <p className={`font-bold text-sm whitespace-nowrap ${isPaid ? "text-gray-400" : "text-gray-900"}`}>
                                            kr {inv.amount.toLocaleString('no-NO', { minimumFractionDigits: 0 })}
                                        </p>
                                        <span className="material-symbols-outlined text-gray-300 group-hover/item:text-blue-500 transition-colors">chevron_right</span>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>

                    <div className="mt-6 mb-1 text-center pb-2">
                        <p className="font-medium text-gray-400 text-xs">Viser {Math.min(limit || invoices.length, invoices.length)} av {invoices.length} fakturaer</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
