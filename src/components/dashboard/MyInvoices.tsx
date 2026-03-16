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
    const unpaid = [...invoices]
        .filter(i => i.status === "PENDING")
        .sort((a, b) => {
            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
            return dateA - dateB;
        });
    const paid = [...invoices]
        .filter(i => i.status === "PAID")
        .sort((a, b) => {
            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
            return dateB - dateA;
        });

    const pendingCount = unpaid.length;
    const sorted = [...unpaid, ...paid];
    const displayed = limit ? sorted.slice(0, limit) : sorted;

    return (
        <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden ${className}`}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100 shrink-0">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500 shrink-0">
                    Mine Fakturaer
                </span>
                {pendingCount > 0 && (
                    <span className="text-[9px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full shrink-0">
                        {pendingCount} ubetalt{pendingCount !== 1 ? "e" : ""}
                    </span>
                )}
                <div className="flex-1 h-px bg-gray-100" />
                <Link
                    href="/invoices"
                    className="text-[10px] font-bold text-gray-400 uppercase tracking-wider hover:text-gray-700 transition-colors shrink-0"
                >
                    Se alle
                </Link>
            </div>

            {/* Invoice slips */}
            <div className="px-4 py-3 space-y-2 overflow-y-auto flex-1">
                {displayed.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-3" style={{ fontFamily: "'Georgia', serif" }}>
                        Ingen ubetalte fakturaer.
                    </p>
                ) : (
                    displayed.map((inv, index) => {
                        const isPaid = inv.status === "PAID";
                        const prevIsPaid = index > 0 && displayed[index - 1].status === "PAID";
                        const showSeparator = isPaid && !prevIsPaid && index > 0;
                        const isOverdue = !isPaid && inv.dueDate && new Date(inv.dueDate) < new Date();
                        const dueDateDisplay = inv.dueDate
                            ? new Date(inv.dueDate).toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" })
                            : null;

                        const accentColor = isPaid
                            ? "#10b981"   // emerald
                            : isOverdue
                            ? "#ef4444"   // red
                            : "#d1d5db";  // gray

                        const statusLabel = isPaid ? "Betalt" : isOverdue ? "Forfalt" : "Ubetalt";
                        const statusClasses = isPaid
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : isOverdue
                            ? "bg-red-50 text-red-600 border-red-100"
                            : "bg-gray-50 text-gray-500 border-gray-200";

                        return (
                            <React.Fragment key={inv.id}>
                            {showSeparator && (
                                <div className="flex items-center gap-3 my-1">
                                    <div className="flex-1 h-px bg-gray-100" />
                                    <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-gray-300">Betalt</span>
                                    <div className="flex-1 h-px bg-gray-100" />
                                </div>
                            )}
                            <Link
                                href={`/invoices/${inv.id}`}
                                className="group block rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all"
                            >
                                <div className="flex">
                                    {/* Status accent stripe */}
                                    <div className="w-1 shrink-0" style={{ backgroundColor: accentColor }} />

                                    <div className="flex-1 min-w-0 px-3.5 py-3">
                                        {/* Title + status badge */}
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <p className="text-[13px] font-semibold text-gray-900 group-hover:text-gray-600 transition-colors leading-snug line-clamp-1">
                                                {inv.title}
                                            </p>
                                            <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0 ${statusClasses}`}>
                                                {statusLabel}
                                            </span>
                                        </div>

                                        {/* Bottom row: due date + amount */}
                                        <div className="flex items-end justify-between gap-2">
                                            <div>
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">
                                                    {isPaid ? "Betalt" : "Forfall"}
                                                </p>
                                                <p className={`text-[11px] font-medium ${isOverdue ? "text-red-500" : "text-gray-500"}`}>
                                                    {dueDateDisplay ?? "Ingen frist"}
                                                </p>
                                            </div>
                                            <p
                                                className={`text-base font-normal leading-none ${
                                                    isPaid ? "text-gray-400" : isOverdue ? "text-red-500" : "text-gray-900"
                                                }`}
                                                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                                            >
                                                {new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(inv.amount)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                            </React.Fragment>
                        );
                    })
                )}
            </div>
        </div>
    );
}
