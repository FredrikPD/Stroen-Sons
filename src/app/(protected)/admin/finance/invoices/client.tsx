"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getInvoiceGroups } from "@/server/actions/invoices";
import { LoadingState } from "@/components/ui/LoadingState";
import {
    SERIF,
    AdminPageHeader,
    AdminEmptyState,
    btnPrimary,
    cardHover,
} from "@/components/admin/ui";

type InvoiceGroup = {
    id: string;
    title: string;
    totalAmount: number;
    paidCount: number;
    totalCount: number;
    createdAt: Date;
    requests: any[]; // Full requests if needed
};

const formatNok = (amount: number) =>
    new Intl.NumberFormat("nb-NO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);

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
        return <LoadingState />;
    }

    const activeGroups = groups.filter(g => g.paidCount < g.totalCount);
    const completedGroups = groups.filter(g => g.paidCount === g.totalCount);

    return (
        <div className="space-y-10">
            <AdminPageHeader
                eyebrow="Økonomi"
                title="Fakturaoversikt"
                description="Oversikt over ekstraordinære innbetalinger (Arrangementer, Turer, etc)."
                actions={
                    <Link href="/admin/finance/invoices/create" className={btnPrimary}>
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Nytt Krav
                    </Link>
                }
            />

            {/* Incomplete / Active Invoices */}
            <div className="space-y-4">
                <h2 className="text-2xl font-normal text-gray-900 flex items-center gap-2" style={{ fontFamily: SERIF }}>
                    <span className="material-symbols-outlined text-primary">pending</span>
                    Aktive Fakturaer
                </h2>
                <div className="grid grid-cols-1 gap-4">
                    {activeGroups.length === 0 ? (
                        <AdminEmptyState icon="pending">
                            Ingen aktive fakturaer under behandling.
                        </AdminEmptyState>
                    ) : (
                        activeGroups.map((group) => {
                            const progress = (group.paidCount / group.totalCount) * 100;
                            return (
                                <Link
                                    href={`/admin/finance/invoices/${encodeURIComponent(group.id)}`}
                                    key={group.id}
                                    className={`block ${cardHover} p-6 cursor-pointer`}
                                >
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="text-lg font-normal text-gray-900" style={{ fontFamily: SERIF }}>{group.title}</h3>
                                            <p className="text-xs text-gray-500">
                                                Opprettet {new Date(group.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-gray-700 tabular-nums" style={{ fontFamily: SERIF }}>{formatNok(group.totalAmount)} NOK</p>
                                            <span className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-full font-medium">
                                                {group.paidCount} / {group.totalCount} betalt
                                            </span>
                                        </div>
                                    </div>

                                    {/* Simple Progress Bar */}
                                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-primary h-2 transition-all duration-500"
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-border-color text-xs text-gray-400">
                                        {group.totalCount - group.paidCount} manglende betalinger.
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Completed / Archived Invoices */}
            <div className="space-y-4">
                <h2 className="text-2xl font-normal text-gray-900 flex items-center gap-2 opacity-75" style={{ fontFamily: SERIF }}>
                    <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                    Arkiv / Ferdige
                </h2>
                <div className="grid grid-cols-1 gap-4 opacity-75 hover:opacity-100 transition-opacity">
                    {completedGroups.length === 0 ? (
                        <AdminEmptyState icon="check_circle">
                            Ingen ferdigbehandlede fakturaer.
                        </AdminEmptyState>
                    ) : (
                        completedGroups.map((group) => (
                            <Link
                                href={`/admin/finance/invoices/${encodeURIComponent(group.id)}`}
                                key={group.id}
                                className={`block ${cardHover} p-6 cursor-pointer`}
                            >
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h3 className="text-lg font-normal text-gray-700" style={{ fontFamily: SERIF }}>{group.title}</h3>
                                        <p className="text-xs text-gray-400">
                                            Opprettet {new Date(group.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-gray-500 tabular-nums" style={{ fontFamily: SERIF }}>{formatNok(group.totalAmount)} NOK</p>
                                        <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                                            Ferdigstilt
                                        </span>
                                    </div>
                                </div>

                                {/* Full Progress Bar */}
                                <div className="w-full bg-emerald-100 rounded-full h-2 overflow-hidden">
                                    <div className="bg-emerald-500 h-2 w-full"></div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
