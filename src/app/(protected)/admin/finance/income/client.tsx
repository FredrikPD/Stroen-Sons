"use strict";
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { Avatar } from "@/components/Avatar";
import { getMonthlyPaymentStatus, generateMonthlyFees, deleteMonthlyFees, deleteSingleInvoice, markMonthlyFeesAsPaid, markMonthlyFeesAsUnpaid } from "@/server/actions/finance";
import Link from "next/link";
import { RequestStatus } from "@prisma/client";
import { useModal } from "@/components/providers/ModalContext";
import { CreateInvoiceModal } from "@/components/admin/finance/CreateInvoiceModal";
import { InvoiceStatusModal, InvoiceStatusTarget } from "@/components/admin/finance/InvoiceStatusModal";
import { LoadingState } from "@/components/ui/LoadingState";
import { ActionInfo } from "@/components/ui/ActionInfo";
import { AdminPageHeader, SERIF, btnSecondary } from "@/components/admin/ui";

// Status chip metadata for the interactive monthly-fee cells.
const STATUS_META: Record<RequestStatus, { label: string; chip: string; icon: string }> = {
    PAID: { label: "Betalt", chip: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "check_circle" },
    PENDING: { label: "Ubetalt", chip: "bg-red-50 text-red-700 border-red-200", icon: "schedule" },
    PAUSED: { label: "Pauset", chip: "bg-amber-50 text-amber-700 border-amber-200", icon: "pause_circle" },
    WAIVED: { label: "Ettergitt", chip: "bg-gray-100 text-gray-600 border-gray-200", icon: "do_not_disturb_on" }
};

// Helper to get month name
const getMonthName = (monthIndex: number) => {
    const months = ["Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"];
    return months[monthIndex];
};

type PaymentRequestInfo = {
    status: RequestStatus;
    id: string;
    amount: number;
};

type MemberPaymentData = {
    id: string;
    name: string;
    membershipType: string;
    avatarUrl?: string | null;
    pauseMonthlyFees: boolean;
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
    const [generating, setGenerating] = useState(false);
    const [markingPaid, setMarkingPaid] = useState(false);
    const [markingUnpaid, setMarkingUnpaid] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [statusModalTarget, setStatusModalTarget] = useState<InvoiceStatusTarget | null>(null);

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


    const openStatusModal = (member: MemberPaymentData, info: PaymentRequestInfo) => {
        setStatusModalTarget({
            id: info.id,
            memberName: member.name,
            title: periods[0],
            amount: info.amount,
            status: info.status
        });
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
            title: "Slett alle genererte krav",
            message: `Sletter alle krav for ${getMonthName(selectedMonth - 1)} ${selectedYear} permanent – kan ikke angres.\n\nFungerer bare hvis ingen har betalt ennå; er ett krav betalt, må du først registrere det som ubetalt.\n\nBruk dette hvis du genererte kravene ved en feil.`,
            type: "error",
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
            message: `Sletter dette ene kravet for ${memberName} permanent – kan ikke angres.\n\nBetalte krav kan ikke slettes – sett dem til ubetalt først.`,
            type: "error",
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

    const handleMarkAllPaid = async () => {
        if (!stats) return;

        const confirmed = await openConfirm({
            title: "Registrer alle som betalt",
            message: `Markerer alle ubetalte krav for ${getMonthName(selectedMonth - 1)} ${selectedYear} som betalt på én gang.\n\n- Det øker saldoen til hvert medlem\n- Medlemmene får varsel (app + push) om innbetalingen\n\nBruk bare når du faktisk har mottatt pengene.`,
            type: "warning",
            confirmText: "Registrer alle",
            cancelText: "Avbryt"
        });

        if (!confirmed) return;

        setMarkingPaid(true);
        try {
            const res = await markMonthlyFeesAsPaid(selectedYear, selectedMonth);
            if (res.success) {
                await fetchData();
                await openAlert({
                    title: "Suksess",
                    message: `Registrerte ${res.count} krav som betalt.`,
                    type: "success"
                });
            } else {
                await openAlert({
                    title: "Feil",
                    message: typeof res.error === 'string' ? res.error : "Ukjent feil",
                    type: "error"
                });
            }
        } catch (e) {
            await openAlert({
                title: "Feil",
                message: "En feil oppstod.",
                type: "error"
            });
        } finally {
            setMarkingPaid(false);
        }
    };

    const handleMarkAllUnpaid = async () => {
        if (!stats) return;

        const confirmed = await openConfirm({
            title: "Registrer alle som ubetalt",
            message: `Angrer betaling for alle betalte krav for ${getMonthName(selectedMonth - 1)} ${selectedYear}.\n\n- Transaksjonene slettes\n- Saldoen til hvert medlem reduseres tilsvarende\n- Medlemmene får ikke varsel om dette`,
            type: "warning",
            confirmText: "Registrer alle",
            cancelText: "Avbryt"
        });

        if (!confirmed) return;

        setMarkingUnpaid(true);
        try {
            const res = await markMonthlyFeesAsUnpaid(selectedYear, selectedMonth);
            if (res.success) {
                await fetchData();
                await openAlert({
                    title: "Suksess",
                    message: `Registrerte ${res.count} krav som ubetalt.`,
                    type: "success"
                });
            } else {
                await openAlert({
                    title: "Feil",
                    message: typeof res.error === 'string' ? res.error : "Ukjent feil",
                    type: "error"
                });
            }
        } catch (e) {
            await openAlert({
                title: "Feil",
                message: "En feil oppstod.",
                type: "error"
            });
        } finally {
            setMarkingUnpaid(false);
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

    const renderPausedBadge = (compact: boolean) => {
        return compact ? (
            <span
                className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-50 border border-amber-200 text-amber-700"
                title="Kontingent pauset av medlemmet denne perioden"
            >
                <span className="material-symbols-outlined text-sm leading-none">pause</span>
            </span>
        ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                <span className="material-symbols-outlined text-[1rem] leading-none">pause_circle</span>
                Pauset av medlem
            </span>
        );
    };

    const renderNoRequestBadge = (member: MemberPaymentData, compact: boolean) => {
        if (member.pauseMonthlyFees) return renderPausedBadge(compact);
        return compact
            ? <span className="text-gray-300">-</span>
            : <span className="text-xs text-gray-400 italic">Ingen krav</span>;
    };

    // Compact (read-only) status indicator for the two previous-period columns.
    const renderCompactStatus = (member: MemberPaymentData, info: PaymentRequestInfo | null) => {
        if (!info) return renderNoRequestBadge(member, true);
        switch (info.status) {
            case 'PAUSED':
                return renderPausedBadge(true);
            case 'PAID':
                return <span className="material-symbols-outlined text-emerald-500 text-sm bg-emerald-50 rounded-full p-1">check</span>;
            case 'WAIVED':
                return <span className="material-symbols-outlined text-gray-400 text-sm bg-gray-100 rounded-full p-1">do_not_disturb_on</span>;
            default:
                return <span className="w-2 h-2 rounded-full bg-red-400"></span>;
        }
    };

    // Clickable status chip for the current period — opens the status-change modal.
    // Fixed width + a left-pinned icon, centered label and right-pinned caret so every
    // chip is the same size and lines up across rows regardless of label length.
    const renderStatusChip = (member: MemberPaymentData, info: PaymentRequestInfo) => {
        const meta = STATUS_META[info.status];
        return (
            <button
                onClick={() => openStatusModal(member, info)}
                className={`inline-flex items-center w-32 gap-1 text-xs font-medium border rounded-md px-2 py-1.5 transition-colors hover:brightness-95 ${meta.chip}`}
                title="Endre status"
            >
                <span className="material-symbols-outlined text-[1rem] leading-none">{meta.icon}</span>
                <span className="flex-1 text-center">{meta.label}</span>
                <span className="material-symbols-outlined text-[1rem] leading-none opacity-60">expand_more</span>
            </button>
        );
    };

    // Generate period options (+/- 9 months)
    const periodOptions = [];
    for (let i = -9; i <= 9; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        periodOptions.push({
            year: d.getFullYear(),
            month: d.getMonth() + 1,
            label: `${getMonthName(d.getMonth())} ${d.getFullYear()}`
        });
    }

    if (dashboardLoading) {
        return <LoadingState />;
    }

    return (
        <div className="space-y-6">
            <AdminPageHeader
                eyebrow="Inntekter"
                title="Månedskontingent"
                description="Administrer innbetalinger av medlemskontingent."
                actions={
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className={`${btnSecondary} whitespace-nowrap`}
                    >
                        <span className="material-symbols-outlined text-[1.2rem]">add</span>
                        Nytt enkeltkrav
                    </button>
                }
            />

            {/* Stats & Overview Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Stats Card */}
                <div className="lg:col-span-2 bg-white border border-border-color rounded-2xl p-6">
                    <div className="flex flex-col h-full justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">Periode</p>
                            <div className="flex flex-col sm:flex-row justify-between sm:items-end mb-6 gap-4">
                                <select
                                    value={`${selectedYear}-${selectedMonth}`}
                                    onChange={(e) => {
                                        const [y, m] = e.target.value.split('-');
                                        setSelectedYear(parseInt(y));
                                        setSelectedMonth(parseInt(m));
                                    }}
                                    className="bg-white border border-border-color rounded-xl px-4 h-11 text-sm font-medium text-gray-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors w-full sm:w-auto"
                                >
                                    {periodOptions.map(opt => (
                                        <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>

                                <div className="grid grid-cols-2 gap-4 sm:gap-8 w-full sm:w-auto sm:flex sm:justify-end">
                                    <div className="text-left sm:text-right">
                                        <p className="text-[11px] text-gray-400 uppercase tracking-[0.15em] font-bold mb-1">Totalt innbetalt</p>
                                        <p className="text-2xl font-normal text-emerald-600 tabular-nums" style={{ fontFamily: SERIF }}>
                                            {stats ? `Kr ${stats.totalCollected.toLocaleString("nb-NO")},-` : '...'}
                                        </p>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <p className="text-[11px] text-gray-400 uppercase tracking-[0.15em] font-bold mb-1">Manglende</p>
                                        <p className="text-2xl font-normal text-red-600 tabular-nums" style={{ fontFamily: SERIF }}>
                                            {stats ? `Kr ${stats.missing.toLocaleString("nb-NO")},-` : '...'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Logic for Generation Button */}
                            {stats && stats.totalCount === 0 ? (
                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm text-amber-800">
                                            Ingen krav generert for denne måneden.
                                        </div>
                                        <button
                                            onClick={handleGenerateFees}
                                            disabled={generating}
                                            className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 shrink-0"
                                        >
                                            {generating ? 'Genererer...' : 'Generer krav'}
                                            <span className="material-symbols-outlined text-[1.2rem]">add_card</span>
                                        </button>
                                    </div>
                                    <ActionInfo variant="info" compact>
                                        Oppretter et krav for hvert aktivt medlem denne måneden og sender dem varsel (app + push) om at fakturaen er klar. Ingen penger flyttes her – du fører betaling etterpå. Trygt å trykke flere ganger: medlemmer som allerede har krav hoppes over.
                                    </ActionInfo>
                                </div>
                            ) : (
                                /* Progress Bar */
                                stats && (
                                    <div className="relative pt-2">
                                        <div className="flex mb-2 items-center justify-between">
                                            <div>
                                                <span className="text-[11px] font-bold inline-block py-1 px-2 uppercase tracking-[0.12em] rounded-full text-primary bg-primary/10">
                                                    Status
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-semibold inline-block text-primary tabular-nums">
                                                    {stats.percentage}% fullført
                                                </span>
                                            </div>
                                        </div>
                                        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-primary/15">
                                            <div style={{ width: `${stats.percentage}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary transition-all duration-500"></div>
                                        </div>
                                    </div>
                                )
                            )}

                            {/* Delete Button (Only if requests exist) */}
                            {stats && stats.totalCount > 0 && (
                                <div className="mt-4 space-y-3">
                                <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-between sm:items-center">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                        <button
                                            onClick={handleMarkAllPaid}
                                            disabled={generating || markingPaid || markingUnpaid || stats.missing === 0}
                                            className={`text-sm font-medium inline-flex items-center justify-center sm:justify-start gap-1.5 transition-colors rounded-lg px-3 py-2 border ${stats.missing === 0 ? 'text-gray-300 border-gray-200 bg-gray-50 cursor-not-allowed' : 'text-emerald-700 border-emerald-100 bg-emerald-50 hover:bg-emerald-100'
                                                }`}
                                        >
                                            {markingPaid ? (
                                                <>
                                                    <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                                    Behandler...
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-[1.2rem]">done_all</span>
                                                    Registrer alle som betalt
                                                </>
                                            )}
                                        </button>

                                        <button
                                            onClick={handleMarkAllUnpaid}
                                            disabled={generating || markingPaid || markingUnpaid || stats.paidCount === 0}
                                            className={`text-sm font-medium inline-flex items-center justify-center sm:justify-start gap-1.5 transition-colors rounded-lg px-3 py-2 border ${stats.paidCount === 0 ? 'text-gray-300 border-gray-200 bg-gray-50 cursor-not-allowed' : 'text-amber-700 border-amber-100 bg-amber-50 hover:bg-amber-100'
                                                }`}
                                        >
                                            {markingUnpaid ? (
                                                <>
                                                    <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                                    Behandler...
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-[1.2rem]">restart_alt</span>
                                                    Registrer alle som ubetalt
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleDeleteFees}
                                        disabled={generating} // Re-use generating state or add deleting state
                                        className="text-red-600 hover:text-red-700 text-sm font-medium inline-flex items-center justify-center sm:justify-start gap-1.5 transition-colors rounded-lg px-3 py-2 border border-red-100 bg-red-50 hover:bg-red-100 disabled:opacity-60"
                                    >
                                        <span className="material-symbols-outlined text-[1rem]">delete</span>
                                        Slett alle generatede krav
                                    </button>
                                </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Info Card */}
                <div className="bg-cream/50 border border-border-color rounded-2xl p-6">
                    <div className="flex items-center gap-2.5 mb-3 text-gray-900">
                        <span className="material-symbols-outlined text-primary">info</span>
                        <h3 className="text-base font-normal" style={{ fontFamily: SERIF }}>Informasjon</h3>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                        Trykk «Generer krav» for å opprette månedens krav. Hvert aktivt medlem får et krav og varsel – ingen penger flyttes før du fører betaling. «Nytt enkeltkrav» oppretter krav for én person.
                    </p>

                    {stats && stats.totalCount > 0 && (
                        <div className="mt-4 space-y-2.5 border-t border-border-color pt-4 text-xs leading-relaxed text-text-secondary">
                            <p><span className="font-semibold text-gray-800">Registrer alle som betalt</span> – øker saldo og varsler medlemmene. Bruk kun når pengene er mottatt.</p>
                            <p><span className="font-semibold text-gray-800">Registrer alle som ubetalt</span> – angrer betaling og reduserer saldo. Uten varsel.</p>
                            <p><span className="font-semibold text-red-600">Slett alle</span> – fjerner månedens krav permanent. Kan ikke angres.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Member List Table */}
            <div className="bg-white border border-border-color rounded-2xl overflow-hidden">
                {loadingData ? (
                    <LoadingState className="h-40" spinnerSizeClassName="h-6 w-6" />
                ) : (
                    <>
                        {/* Table Header */}
                        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-[#faf8f3] border-b border-border-color text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                            <div className="col-span-4">Medlem</div>
                            <div className="col-span-2">MedlemsType</div>
                            {/* Periods: [Current, Prev, PrevPrev] -> Reverse for display? No, keeping provided order but checking indexes */}
                            <div className="col-span-2 text-center">{periods[2] ? formatTitle(periods[2]) : '-'}</div>
                            <div className="col-span-2 text-center">{periods[1] ? formatTitle(periods[1]) : '-'}</div>
                            <div className="col-span-2 text-center text-primary">{periods[0] ? formatTitle(periods[0]) : '-'}</div>
                        </div>

                        {/* Table Body */}
                        <div className="divide-y divide-border-color">
                            {members.map((member) => (
                                <div key={member.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-black/[0.02] transition-colors">
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
                                        <span className="text-xs font-medium px-2 py-1 bg-cream rounded-md text-text-secondary">
                                            {member.membershipType}
                                        </span>
                                    </div>

                                    {/* History Period -2 */}
                                    <div className="hidden md:flex col-span-2 justify-center">
                                        {renderCompactStatus(member, member.history[periods[2]] ?? null)}
                                    </div>

                                    {/* History Period -1 */}
                                    <div className="hidden md:flex col-span-2 justify-center">
                                        {renderCompactStatus(member, member.history[periods[1]] ?? null)}
                                    </div>

                                    {/* Current Period */}
                                    <div className="col-span-6 md:col-span-2 flex items-center justify-center gap-2">
                                        {member.history[periods[0]] ? (
                                            <>
                                                {renderStatusChip(member, member.history[periods[0]]!)}
                                                {/* Always reserve the delete slot so chips stay aligned across rows. */}
                                                <span className="w-8 flex-shrink-0 flex items-center justify-center">
                                                    {member.history[periods[0]]!.status !== 'PAID' && (
                                                        <button
                                                            onClick={() => handleDeleteSingle(member.history[periods[0]]!.id, member.name)}
                                                            className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-full hover:bg-red-50"
                                                            title="Slett enkeltkrav"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">delete</span>
                                                        </button>
                                                    )}
                                                </span>
                                            </>
                                        ) : (
                                            renderNoRequestBadge(member, false)
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
            <InvoiceStatusModal
                invoice={statusModalTarget}
                onClose={() => setStatusModalTarget(null)}
                onSuccess={fetchData}
            />
        </div>
    );
}
