"use client";

import React, { useState } from "react";
import { PremiumModal } from "@/components/ui/PremiumModal";
import { createFutureMonthlyFees } from "@/server/actions/finance";
import { useModal } from "@/components/providers/ModalContext";

interface MemberOption {
    id: string;
    name: string;
}

interface CreateInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    members: MemberOption[];
    onSuccess: () => void;
}

export function CreateInvoiceModal({ isOpen, onClose, members, onSuccess }: CreateInvoiceModalProps) {
    const { openAlert } = useModal();
    const [loading, setLoading] = useState(false);

    // Form State
    const [selectedMemberId, setSelectedMemberId] = useState("");
    const [startYear, setStartYear] = useState(new Date().getFullYear());
    const [startMonth, setStartMonth] = useState(new Date().getMonth() + 1);
    const [count, setCount] = useState(1);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMemberId) {
            await openAlert({ title: "Mangler info", message: "Du må velge et medlem", type: "warning" });
            return;
        }

        setLoading(true);
        try {
            const res = await createFutureMonthlyFees(selectedMemberId, startYear, startMonth, count);
            if (res.success) {
                onClose();
                onSuccess();
                await openAlert({
                    title: "Suksess",
                    message: `Opprettet ${res.created} krav. (${res.skipped} eksisterte allerede)`,
                    type: "success"
                });
                // Reset form slightly
                setSelectedMemberId("");
            } else {
                await openAlert({ title: "Feil", message: res.error || "Ukjent feil", type: "error" });
            }
        } catch (error) {
            await openAlert({ title: "Feil", message: "Noe gikk galt", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] overflow-y-auto" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
                <div
                    className="fixed inset-0 bg-gray-900/40 transition-opacity"
                    onClick={onClose}
                    aria-hidden="true"
                />

                {/* Modal Panel */}
                <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                    <form onSubmit={handleSubmit}>
                        <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                            <div className="sm:flex sm:items-start mb-6">
                                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-indigo-50 sm:mx-0 sm:h-10 sm:w-10">
                                    <span className="material-symbols-outlined text-indigo-600 text-2xl">add_card</span>
                                </div>
                                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                                    <h3 className="text-lg font-bold leading-6 text-gray-900">
                                        Opprett enkeltkrav
                                    </h3>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500">
                                            Manuelt opprett medlemskontingent for fremtidige måneder.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-5">
                                {/* Member Selection */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                                        Medlem
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={selectedMemberId}
                                            onChange={(e) => setSelectedMemberId(e.target.value)}
                                            className="block w-full appearance-none rounded-xl border-gray-200 bg-gray-50 py-3 px-4 text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-indigo-500 sm:text-sm transition-colors"
                                        >
                                            <option value="">Velg medlem...</option>
                                            {members.map(m => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                            <span className="material-symbols-outlined text-sm">expand_more</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Date Selection */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                                            Start År
                                        </label>
                                        <input
                                            type="number"
                                            value={startYear}
                                            onChange={(e) => setStartYear(parseInt(e.target.value))}
                                            className="block w-full rounded-xl border-gray-200 bg-gray-50 py-3 px-4 text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-indigo-500 sm:text-sm transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                                            Start Måned
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={startMonth}
                                                onChange={(e) => setStartMonth(parseInt(e.target.value))}
                                                className="block w-full appearance-none rounded-xl border-gray-200 bg-gray-50 py-3 px-4 text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-indigo-500 sm:text-sm transition-colors"
                                            >
                                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                                    <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleString('nb-NO', { month: 'long' })}</option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                                <span className="material-symbols-outlined text-sm">expand_more</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Count */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                                        Antall måneder
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="1"
                                            max="12"
                                            value={count}
                                            onChange={(e) => setCount(parseInt(e.target.value))}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                        />
                                        <span className="flex items-center justify-center w-12 h-10 rounded-lg bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                                            {count}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-xs text-gray-400">
                                        Genererer {count} faktura(er) fra og med valgt måned.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse gap-3 border-t border-gray-100">
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex w-full justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all sm:w-auto disabled:opacity-50 disabled:shadow-none"
                            >
                                {loading ? 'Oppretter...' : 'Opprett Krav'}
                            </button>
                            <button
                                type="button"
                                className="mt-3 inline-flex w-full justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto transition-all"
                                onClick={onClose}
                            >
                                Avbryt
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
