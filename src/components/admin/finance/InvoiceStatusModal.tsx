"use client";

import React, { useEffect, useState } from "react";
import { RequestStatus } from "@prisma/client";
import { setInvoiceStatus } from "@/server/actions/finance";
import { useModal } from "@/components/providers/ModalContext";

export interface InvoiceStatusTarget {
    id: string;
    memberName: string;
    title: string;
    amount: number;
    status: RequestStatus;
}

interface InvoiceStatusModalProps {
    invoice: InvoiceStatusTarget | null;
    onClose: () => void;
    onSuccess: () => void | Promise<void>;
}

const formatNok = (amount: number) =>
    new Intl.NumberFormat("nb-NO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);

const STATUS_OPTIONS: Array<{
    value: RequestStatus;
    label: string;
    description: string;
    icon: string;
    activeClasses: string;
    iconColor: string;
}> = [
    {
        value: RequestStatus.PAID,
        label: "Betalt",
        description: "Registrert som innbetalt",
        icon: "check_circle",
        activeClasses: "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100",
        iconColor: "text-emerald-600"
    },
    {
        value: RequestStatus.PENDING,
        label: "Ubetalt",
        description: "Aktivt krav som avventer betaling",
        icon: "schedule",
        activeClasses: "border-red-400 bg-red-50 ring-2 ring-red-100",
        iconColor: "text-red-600"
    },
    {
        value: RequestStatus.PAUSED,
        label: "Satt på pause",
        description: "Pauset – ingen betaling forventes",
        icon: "pause_circle",
        activeClasses: "border-amber-400 bg-amber-50 ring-2 ring-amber-100",
        iconColor: "text-amber-600"
    },
    {
        value: RequestStatus.WAIVED,
        label: "Ettergitt",
        description: "Frafalt – kravet er ettergitt",
        icon: "do_not_disturb_on",
        activeClasses: "border-gray-400 bg-gray-100 ring-2 ring-gray-200",
        iconColor: "text-gray-600"
    }
];

export function InvoiceStatusModal({ invoice, onClose, onSuccess }: InvoiceStatusModalProps) {
    const { openAlert } = useModal();
    const [selectedStatus, setSelectedStatus] = useState<RequestStatus | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setSelectedStatus(invoice ? invoice.status : null);
    }, [invoice]);

    if (!invoice || !selectedStatus) return null;

    const unchanged = selectedStatus === invoice.status;
    const enteringPaid = selectedStatus === RequestStatus.PAID && invoice.status !== RequestStatus.PAID;
    const leavingPaid = invoice.status === RequestStatus.PAID && selectedStatus !== RequestStatus.PAID;

    const effectNote = unchanged
        ? "Velg en ny status for å gjøre en endring."
        : enteringPaid
            ? `Registrerer innbetaling og øker medlemmets saldo med ${formatNok(invoice.amount)} kr.`
            : leavingPaid
                ? `Fjerner registrert innbetaling og reduserer medlemmets saldo med ${formatNok(invoice.amount)} kr.`
                : "Ingen endring i saldo.";

    const effectTone = enteringPaid
        ? "bg-emerald-50 text-emerald-800 border-emerald-100"
        : leavingPaid
            ? "bg-amber-50 text-amber-800 border-amber-100"
            : "bg-blue-50 text-blue-900/80 border-blue-100";

    const handleConfirm = async () => {
        if (unchanged) return;
        setLoading(true);
        try {
            const res = await setInvoiceStatus(invoice.id, selectedStatus);
            if (res.success) {
                onClose();
                await onSuccess();
            } else {
                await openAlert({
                    title: "Feil",
                    message: typeof res.error === "string" ? res.error : "Kunne ikke oppdatere status.",
                    type: "error"
                });
            }
        } catch {
            await openAlert({
                title: "Feil",
                message: "En feil oppstod under oppdatering av status.",
                type: "error"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] overflow-y-auto" role="dialog" aria-modal="true">
            <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-gray-900/40 transition-opacity"
                    onClick={loading ? undefined : onClose}
                    aria-hidden="true"
                />

                {/* Panel */}
                <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                    <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                        <div className="flex items-start gap-4 mb-5">
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-indigo-50 sm:h-10 sm:w-10">
                                <span className="material-symbols-outlined text-indigo-600 text-2xl">receipt_long</span>
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-lg font-bold leading-6 text-gray-900">Endre status</h3>
                                <p className="text-sm text-gray-500 mt-0.5 truncate">{invoice.memberName}</p>
                                <p className="text-xs text-gray-400">
                                    {invoice.title} · {formatNok(invoice.amount)} kr
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {STATUS_OPTIONS.map((option) => {
                                const active = selectedStatus === option.value;
                                const isCurrent = invoice.status === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setSelectedStatus(option.value)}
                                        disabled={loading}
                                        className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all disabled:opacity-60 ${
                                            active
                                                ? option.activeClasses
                                                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                                        }`}
                                    >
                                        <span className={`material-symbols-outlined text-xl ${active ? option.iconColor : "text-gray-400"}`}>
                                            {option.icon}
                                        </span>
                                        <span className="flex-1 min-w-0">
                                            <span className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-gray-900">{option.label}</span>
                                                {isCurrent && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
                                                        Nåværende
                                                    </span>
                                                )}
                                            </span>
                                            <span className="block text-xs text-gray-500">{option.description}</span>
                                        </span>
                                        <span className={`material-symbols-outlined text-lg ${active ? option.iconColor : "text-transparent"}`}>
                                            check
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className={`mt-4 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs leading-relaxed ${effectTone}`}>
                            <span className="material-symbols-outlined text-[1rem] leading-none mt-0.5">info</span>
                            <span>{effectNote}</span>
                        </div>
                    </div>

                    <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse gap-3 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={loading || unchanged}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all sm:w-auto disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    Lagrer...
                                </>
                            ) : (
                                "Bekreft"
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="mt-3 inline-flex w-full justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto transition-all disabled:opacity-50"
                        >
                            Avbryt
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
