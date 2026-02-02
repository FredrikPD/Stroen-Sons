"use strict";
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { Avatar } from "@/components/Avatar";
import { getMonthlyPaymentStatus, generateMonthlyFees, togglePaymentStatus, deleteMonthlyFees, deleteSingleInvoice } from "@/server/actions/finance";
import Link from "next/link";
import { RequestStatus } from "@prisma/client";
import { useModal } from "@/components/providers/ModalContext";
import { CreateInvoiceModal } from "@/components/admin/finance/CreateInvoiceModal";

// Helper to get month name
const getMonthName = (monthIndex: number) => {
    const months = ["Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"];
    return months[monthIndex];
};

type PaymentRequestInfo = {
    status: RequestStatus;
    id: string;
};

type MemberPaymentData = {
    id: string;
    name: string;
    membershipType: string;
    avatarUrl?: string | null;
    history: {
        [title: string]: PaymentRequestInfo | null;
    };
};

type FinanceStats = {
    totalCollected: number;
    expectedTotal: number;
    missing: number;
    paidCount: number;
    totalCount: number;
    percentage: number;
};

export default function IncomePage() {
    const { data: dashboardData, loading: dashboardLoading } = useAdminDashboard();
    const { openConfirm, openAlert } = useModal();

    // ... existing state ...
    const today = new Date();
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // 1-12

    // Data State
    const [members, setMembers] = useState<MemberPaymentData[]>([]);
    const [periods, setPeriods] = useState<string[]>([]); // These are TITLES now
    const [stats, setStats] = useState<FinanceStats | null>(null);
    const [loadingData, setLoadingData] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Fetch Data
    const fetchData = useCallback(async () => {
        setLoadingData(true);
        try {
            const data = await getMonthlyPaymentStatus(selectedYear, selectedMonth);
            // @ts-ignore - Fixing type mismatch in quick iteration
            setMembers(data.members);
            setPeriods(data.periods);
            setStats(data.stats);
        } catch (error) {
            console.error("Failed to fetch payment data", error);
        } finally {
            setLoadingData(false);
        }
    }, [selectedYear, selectedMonth]);

    useEffect(() => {
        if (!dashboardLoading) {
            fetchData();
        }
    }, [fetchData, dashboardLoading]);


    const handleTogglePayment = async (requestId: string) => {
        setUpdating(requestId);
        try {
            await togglePaymentStatus(requestId);
            await fetchData();
        } catch (error) {
            console.error("Failed to toggle payment", error);
            await openAlert({
                title: "Feil",
                message: "Feil ved oppdatering av betaling",
                type: "error"
            });
        } finally {
            setUpdating(null);
        }
    };

    const handleGenerateFees = async () => {
        const confirmed = await openConfirm({
            title: "Generer fakturaer",
            message: `Generer fakturaer for ${getMonthName(selectedMonth - 1)} ${selectedYear}?`,
            type: "info",
            confirmText: "Generer"
        });

        if (!confirmed) return;

        setGenerating(true);
        try {
            const res = await generateMonthlyFees(selectedYear, selectedMonth);
            if (res.success) {
                await fetchData();
            } else {
                await openAlert({
                    title: "Feil ved generering",
                    message: typeof res.error === 'string' ? res.error : "Ukjent feil",
                    type: "error"
                });
            }
        } catch (e) {
            await openAlert({
                title: "Feil",
                message: "En feil oppstod under generering",
                type: "error"
            });
        } finally {
            setGenerating(false);
        }
    };

    const handleDeleteFees = async () => {
        const confirmed = await openConfirm({
            title: "Slett alle krav",
            message: `ER DU SIKKER? Dette vil slette ALLE ubetalte krav for ${getMonthName(selectedMonth - 1)} ${selectedYear}.`,
            type: "warning",
            confirmText: "Slett",
            cancelText: "Avbryt"
        });

        if (!confirmed) return;

        setGenerating(true); // Reuse generating loading state
        try {
            const res = await deleteMonthlyFees(selectedYear, selectedMonth);
            if (res.success) {
                await fetchData();
                await openAlert({
                    title: "Suksess",
                    message: `Slettet ${res.count} krav.`,
                    type: "success"
                });
            } else {
                await openAlert({
                    title: "Kunne ikke slette",
                    message: typeof res.error === 'string' ? res.error : "Ukjent feil",
                    type: "error"
                });
            }
        } catch (e) {
            await openAlert({
                title: "Feil",
                message: "En feil oppstod under sletting.",
                type: "error"
            });
        } finally {
            setGenerating(false);
        }
    };

    const handleDeleteSingle = async (requestId: string, memberName: string) => {
        const confirmed = await openConfirm({
            title: "Slett enkeltkrav",
            message: `Vil du slette kravet for ${memberName}?`,
            type: "warning",
            confirmText: "Slett",
            cancelText: "Avbryt"
        });

        if (!confirmed) return;

        setGenerating(true);
        try {
            const res = await deleteSingleInvoice(requestId);
            if (res.success) {
                await fetchData();
                await openAlert({
                    title: "Slettet",
                    message: "Kravet ble slettet.",
                    type: "success"
                });
            } else {
                await openAlert({
                    title: "Kunne ikke slette",
                    message: res.error || "Ukjent feil",
                    type: "error"
                });
            }
        } catch (e) {
            await openAlert({
                title: "Feil",
                message: "Kunne ikke slette kravet.",
                type: "error"
            });
        } finally {
            setGenerating(false);
        }
    };

    // Helper to format the Title into something short for the header
    const formatTitle = (title: string) => {
        // "Medlemskontingent 2025-12" -> "Desember"
        const parts = title.split(' ');
        if (parts.length < 2) return title;
        const datePart = parts[1];
        const [y, m] = datePart.split('-');
        return getMonthName(parseInt(m) - 1);
    };

    // Generate period options (next 6 months + last 12 months)
    const periodOptions = [];
    for (let i = -6; i < 6; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        periodOptions.push({
            year: d.getFullYear(),
            month: d.getMonth() + 1,
            label: `${getMonthName(d.getMonth())} ${d.getFullYear()}`
        });
    }

    if (dashboardLoading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Månedskontingent</h1>
                    <p className="text-gray-500 text-sm max-w-3xl">
                        Administrer innbetalinger av medlemskontingent.
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm"
                >
                    <span className="material-symbols-outlined text-[1.2rem]">add</span>
                    Nytt enkeltkrav
                </button>
            </div>



            {/* Stats & Overview Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Stats Card */}
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex flex-col h-full justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">PERIODE</p>
                            <div className="flex flex-col sm:flex-row justify-between items-end mb-6 gap-4">
                                <select
                                    value={`${selectedYear}-${selectedMonth}`}
                                    onChange={(e) => {
                                        const [y, m] = e.target.value.split('-');
                                        setSelectedYear(parseInt(y));
                                        setSelectedMonth(parseInt(m));
                                    }}
                                    className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
                                >
                                    {periodOptions.map(opt => (
                                        <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>

                                <div className="flex gap-8 w-full sm:w-auto justify-between sm:justify-end">
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 mb-1">Totalt innbetalt</p>
                                        <p className="text-xl font-bold text-gray-900">
                                            {stats ? `Kr ${stats.totalCollected.toLocaleString("nb-NO")},-` : '...'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 mb-1">Manglende</p>
                                        <p className="text-xl font-bold text-red-500">
                                            {stats ? `Kr ${stats.missing.toLocaleString("nb-NO")},-` : '...'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Logic for Generation Button */}
                            {stats && stats.totalCount === 0 ? (
                                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 flex items-center justify-between">
                                    <div className="text-sm text-yellow-800">
                                        Ingen krav generert for denne måneden.
                                    </div>
                                    <button
                                        onClick={handleGenerateFees}
                                        disabled={generating}
                                        className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                                    >
                                        {generating ? 'Genererer...' : 'Generer krav'}
                                        <span className="material-symbols-outlined text-[1.2rem]">add_card</span>
                                    </button>
                                </div>
                            ) : (
                                /* Progress Bar */
                                stats && (
                                    <div className="relative pt-2">
                                        <div className="flex mb-2 items-center justify-between">
                                            <div>
                                                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-50">
                                                    Status
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-semibold inline-block text-indigo-600">
                                                    {stats.percentage}% fullført
                                                </span>
                                            </div>
                                        </div>
                                        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-100">
                                            <div style={{ width: `${stats.percentage}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 transition-all duration-500"></div>
                                        </div>
                                    </div>
                                )
                            )}

                            {/* Delete Button (Only if requests exist) */}
                            {stats && stats.totalCount > 0 && (
                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={handleDeleteFees}
                                        disabled={generating} // Re-use generating state or add deleting state
                                        className="text-red-500 hover:text-red-700 text-xs font-medium flex items-center gap-1 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[1rem]">delete</span>
                                        Slett alle generatede krav
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Info Card */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-3 text-blue-800">
                        <span className="material-symbols-outlined">info</span>
                        <h3 className="font-bold text-sm">Ny funksjonalitet</h3>
                    </div>
                    <p className="text-xs text-blue-900/80 leading-relaxed mb-4">
                        Systemet baserer seg nå på "Betalingskrav".
                        Du må trykke "Generer krav" hver måned for å opprette kravene.
                    </p>
                    <p className="text-xs text-blue-900/80 leading-relaxed font-semibold">
                        Dette sikrer at riktig beløp føres selv om priser endres.
                    </p>
                </div>
            </div>

            {/* Member List Table */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                {loadingData ? (
                    <div className="flex justify-center items-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                ) : (
                    <>
                        {/* Table Header */}
                        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            <div className="col-span-4">Medlem</div>
                            <div className="col-span-2">MedlemsType</div>
                            {/* Periods: [Current, Prev, PrevPrev] -> Reverse for display? No, keeping provided order but checking indexes */}
                            <div className="col-span-2 text-center">{periods[2] ? formatTitle(periods[2]) : '-'}</div>
                            <div className="col-span-2 text-center">{periods[1] ? formatTitle(periods[1]) : '-'}</div>
                            <div className="col-span-2 text-center text-indigo-600">{periods[0] ? formatTitle(periods[0]) : '-'}</div>
                        </div>

                        {/* Table Body */}
                        <div className="divide-y divide-gray-100">
                            {members.map((member) => (
                                <div key={member.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50/50 transition-colors">
                                    {/* Member Info */}
                                    <div className="col-span-12 md:col-span-4 flex items-center gap-3">
                                        <div className="flex-shrink-0">
                                            <Avatar src={member.avatarUrl} initials={member.name.substring(0, 2).toUpperCase()} size="md" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{member.name}</p>
                                            <p className="text-xs text-gray-500">{member.membershipType}</p>
                                        </div>
                                    </div>

                                    <div className="col-span-6 md:col-span-2 flex items-center">
                                        <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-md text-gray-600">
                                            {member.membershipType}
                                        </span>
                                    </div>

                                    {/* History Period -2 */}
                                    <div className="hidden md:flex col-span-2 justify-center">
                                        {member.history[periods[2]] ? (
                                            member.history[periods[2]]!.status === 'PAID' ?
                                                <span className="material-symbols-outlined text-emerald-500 text-sm bg-emerald-50 rounded-full p-1">check</span>
                                                :
                                                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </div>

                                    {/* History Period -1 */}
                                    <div className="hidden md:flex col-span-2 justify-center">
                                        {member.history[periods[1]] ? (
                                            member.history[periods[1]]!.status === 'PAID' ?
                                                <span className="material-symbols-outlined text-emerald-500 text-sm bg-emerald-50 rounded-full p-1">check</span>
                                                :
                                                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </div>

                                    {/* Current Period */}
                                    <div className="col-span-6 md:col-span-2 flex items-center justify-between md:justify-center gap-4">
                                        {member.history[periods[0]] ? (
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleTogglePayment(member.history[periods[0]]!.id)}
                                                        disabled={updating === member.history[periods[0]]!.id}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${member.history[periods[0]]!.status === 'PAID' ? 'bg-emerald-500' : 'bg-gray-200'
                                                            } ${updating === member.history[periods[0]]!.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        <span className={`${member.history[periods[0]]!.status === 'PAID' ? 'translate-x-6' : 'translate-x-1'
                                                            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                                                    </button>
                                                    <span className={`text-xs font-medium w-12 ${member.history[periods[0]]!.status === 'PAID' ? 'text-gray-900' : 'text-gray-500'
                                                        }`}>
                                                        {member.history[periods[0]]!.status === 'PAID' ? "Betalt" : "Ubetalt"}
                                                    </span>
                                                </div>

                                                <button
                                                    onClick={() => handleDeleteSingle(member.history[periods[0]]!.id, member.name)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-full hover:bg-red-50"
                                                    title="Slett enkeltkrav"
                                                >
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">Ingen krav</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
            <CreateInvoiceModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                members={members.map(m => ({ id: m.id, name: m.name }))}
                onSuccess={fetchData}
            />
        </div>
    );
}
