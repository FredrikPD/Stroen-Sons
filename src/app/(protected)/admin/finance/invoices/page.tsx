"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getInvoiceGroups } from "@/server/actions/invoices";

type InvoiceGroup = {
    title: string;
    totalAmount: number;
    paidCount: number;
    totalCount: number;
    createdAt: Date;
    requests: any[]; // Full requests if needed
};

export default function InvoicesPage() {
    const [groups, setGroups] = useState<InvoiceGroup[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getInvoiceGroups().then(res => {
            if (res.success && res.groups) {
                setGroups(res.groups);
            }
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">

                <Link
                    href="/admin/finance/invoices/create"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition"
                >
                    + Nytt Krav
                </Link>
            </div>

            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Fakturaoversikt</h1>
                    <p className="text-gray-500 text-sm max-w-3xl">
                        Oversikt over ekstraordinære innbetalinger (Arrangementer, Turer, etc).
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {groups.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-200">
                        <p className="text-gray-500">Ingen fakturaer opprettet enda.</p>
                    </div>
                ) : (
                    groups.map((group) => (
                        <Link
                            href={`/admin/finance/invoices/${encodeURIComponent(group.title)}`}
                            key={group.title}
                            className="block bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{group.title}</h3>
                                    <p className="text-xs text-gray-500">
                                        Opprettet {new Date(group.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-gray-600">{group.totalAmount.toLocaleString()} NOK</p>
                                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                                        {group.paidCount} / {group.totalCount} betalt
                                    </span>
                                </div>
                            </div>

                            {/* Simple Progress Bar */}
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-indigo-500 h-2 transition-all duration-500"
                                    style={{ width: `${(group.paidCount / group.totalCount) * 100}%` }}
                                ></div>
                            </div>

                            {/* Maybe verify simple list of missing payers? */}
                            <div className="mt-4 pt-4 border-t border-gray-50 text-xs text-gray-400">
                                {group.totalCount - group.paidCount} manglende betalinger.
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
