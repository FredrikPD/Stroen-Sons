"use client";

import React from "react";
import { RequestStatus } from "@prisma/client";

type Invoice = {
    id: string;
    title: string;
    amount: number;
    dueDate: string | null;
    status: RequestStatus;
    category: string;
};

export function MyInvoices({ invoices, className = "" }: { invoices: Invoice[], className?: string }) {
    if (invoices.length === 0) {
        return (
            <div className={`bg-white border border-gray-200 rounded-xl p-8 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden ${className}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 to-transparent pointer-events-none" />
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
                    <span className="material-symbols-outlined text-3xl">task_alt</span>
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">Ingen fakturaer</h3>
                <p className="text-gray-500 text-sm max-w-[250px]">
                    Du har ingen ubetalte fakturaer.
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
                        <h3 className="font-bold text-gray-900 text-base">Kommende Fakturaer</h3>
                    </div>
                    <div className="bg-[#FFF8E1] text-[#785900] text-[10px] uppercase tracking-wide font-bold px-2.5 py-1 rounded-full border border-[#FFE082]/30">
                        {invoices.length} til forfall
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pr-1 -mr-1 space-y-3 custom-scrollbar">
                    <div className="space-y-3">
                        {invoices.map((inv) => {
                            const isOverdue = inv.dueDate && new Date(inv.dueDate) < new Date();
                            const dueDateDisplay = inv.dueDate
                                ? new Date(inv.dueDate).toLocaleDateString('no-NO')
                                : 'Ingen frist';

                            return (
                                <div key={inv.id} className="border border-gray-200 p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-blue-200 transition-colors bg-white/60 hover:bg-white backdrop-blur-sm">
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{inv.title}</p>
                                        <p className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-2">
                                            <span>#{inv.id.slice(-4).toUpperCase()}</span>
                                            <span className="hidden md:inline text-gray-300">•</span>
                                            <span className={isOverdue ? "text-red-600 font-medium" : "text-gray-500"}>
                                                Forfall: {dueDateDisplay}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto mt-1 md:mt-0">
                                        <p className="font-bold text-base text-gray-900 whitespace-nowrap">
                                            kr {inv.amount.toLocaleString('no-NO', { minimumFractionDigits: 0 })}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="mt-6 mb-1 text-center pb-2">
                        <p className="font-medium text-gray-600 text-sm">Ingen flere fakturaer</p>
                        <p className="text-xs text-gray-400 mt-0.5">Du er ajour med alle andre innbetalinger.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
