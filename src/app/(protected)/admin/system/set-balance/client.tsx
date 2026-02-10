"use strict";
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useModal } from "@/components/providers/ModalContext";
import { getMembersAndEvents, setMemberBalance } from "@/server/actions/finance";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";

type Member = {
    id: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
};

export default function SetBalancePage() {
    const { openAlert, openConfirm } = useModal();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [members, setMembers] = useState<Member[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState("");
    const [newBalance, setNewBalance] = useState<string>(""); // String for input handling
    const [reason, setReason] = useState("");

    useEffect(() => {
        const load = async () => {
            try {
                const { members } = await getMembersAndEvents();
                // @ts-ignore - Prisma Date vs string serialization in Client Components
                setMembers(members as Member[]);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Placeholder until I add the server action
    const [currentBalance, setCurrentBalance] = useState<number | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMemberId || newBalance === "" || !reason) {
            openAlert({ title: "Feil", message: "Alle felt må fylles ut", type: "warning" });
            return;
        }

        const confirmed = await openConfirm({
            title: "Bekreft justering",
            message: `Er du sikker på at du vil sette saldoen til ${newBalance} kr? Dette vil opprette en justeringstransaksjon.`,
            type: "warning",
            confirmText: "Ja, juster"
        });

        if (!confirmed) return;

        setSubmitting(true);
        try {
            const res = await setMemberBalance(selectedMemberId, Number(newBalance), reason);
            if (res.success) {
                openAlert({ title: "Suksess", message: "Saldo oppdatert", type: "success" });
                setNewBalance("");
                setReason("");
                // Optionally refresh current balance if we had it
            } else {
                openAlert({ title: "Feil", message: res.error || "Ukjent feil", type: "error" });
            }
        } catch (e) {
            openAlert({ title: "Feil", message: "En feil oppstod", type: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Sett Saldo</h1>
                <p className="text-gray-500 mt-2">
                    Juster saldo manuelt. Dette vil opprette en korrigerende transaksjon automatisk.
                </p>
            </div>

            <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Member Select */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Medlem</label>
                        <select
                            value={selectedMemberId}
                            onChange={(e) => {
                                setSelectedMemberId(e.target.value);
                                // Reset current balance view or trigger fetch here in future
                                setCurrentBalance(null);
                            }}
                            className="w-full rounded-xl border-gray-200 bg-gray-50 py-3 px-4 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                        >
                            <option value="">Velg medlem...</option>
                            {members.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.firstName} {m.lastName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* New Balance */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Ny Saldo (NOK)</label>
                        <input
                            type="number"
                            value={newBalance}
                            onChange={(e) => setNewBalance(e.target.value)}
                            placeholder="f.eks. 0"
                            className="w-full rounded-xl border-gray-200 bg-gray-50 py-3 px-4 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 font-mono text-lg"
                        />
                        <p className="text-xs text-gray-400 mt-2">
                            Dette er beløpet medlemmet skal ha stående på konto ETTER justeringen.
                        </p>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Årsak til justering</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Forklar hvorfor saldoen endres..."
                            rows={3}
                            className="w-full rounded-xl border-gray-200 bg-gray-50 py-3 px-4 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || !selectedMemberId}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:shadow-none"
                    >
                        {submitting ? 'Oppdaterer...' : 'Oppdater Saldo'}
                    </button>
                </form>
            </div>
        </div>
    );
}
