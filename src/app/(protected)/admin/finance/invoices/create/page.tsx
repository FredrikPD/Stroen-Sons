"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getInvoiceFormData } from "@/server/actions/invoices";
import { createBulkPaymentRequests } from "@/server/actions/payment-requests";
import Link from "next/link";
import { PaymentCategory } from "@prisma/client";

export default function CreateInvoicePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Data filtering
    const [members, setMembers] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [memberSearch, setMemberSearch] = useState("");

    // Form
    const [title, setTitle] = useState("");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState<string>("");
    const [category, setCategory] = useState<"EVENT" | "OTHER">("EVENT");
    const [selectedEventId, setSelectedEventId] = useState("");
    const [targetType, setTargetType] = useState<"ALL" | "EVENT_ATTENDEES" | "MANUAL">("ALL");
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

    useEffect(() => {
        getInvoiceFormData().then((data) => {
            setMembers(data.members);
            setEvents(data.events);
            setLoading(false);
        });
    }, []);

    // Filter Logic
    const getTargetMemberIds = () => {
        if (targetType === "ALL") return members.map(m => m.id);
        if (targetType === "MANUAL") return selectedMemberIds;
        if (targetType === "EVENT_ATTENDEES" && selectedEventId) {
            const evt = events.find(e => e.id === selectedEventId);
            return evt ? evt.attendees.map((a: any) => a.id) : [];
        }
        return [];
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const targetIds = getTargetMemberIds();

        if (targetIds.length === 0) {
            alert("Ingen mottakere valgt");
            setSubmitting(false);
            return;
        }

        const res = await createBulkPaymentRequests({
            title,
            description,
            amount: parseInt(amount),
            dueDate: dueDate ? new Date(dueDate) : undefined,
            category: category as PaymentCategory,
            eventId: selectedEventId || undefined,
            memberIds: targetIds
        });

        if (res.success) {
            alert(`Opprettet ${res.count} krav.`);
            router.push("/admin/finance/invoices");
        } else {
            alert("Feil: " + res.error);
        }
        setSubmitting(false);
    };

    if (loading) return <div className="p-10 text-center text-gray-500">Laster data...</div>;

    const targetCount = getTargetMemberIds().length;
    const filteredMembers = members.filter(m =>
        (m.firstName + " " + m.lastName).toLowerCase().includes(memberSearch.toLowerCase())
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <Link href="/admin/finance/invoices" className="inline-flex items-center text-gray-500 hover:text-gray-900 transition-colors font-medium text-sm mb-4">
                <span className="material-symbols-outlined mr-1 text-[1.2rem]">arrow_back</span>
                Tilbake til oversikt
            </Link>

            <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-xl shadow-gray-200/50">
                <div className="mb-8 border-b border-gray-100 pb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Opprett Faktura</h1>
                    <p className="text-gray-500">Send betalingskrav til medlemmer eller deltakere.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Tittel</label>
                            <input
                                required
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full bg-gray-50 border-gray-100 rounded-xl px-4 py-3 font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                                placeholder="F.eks. Hytte tur Depositum"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Beløp (NOK)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-3.5 text-gray-400 material-symbols-outlined text-[1.2rem]">attach_money</span>
                                <input
                                    required
                                    type="number"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="w-full bg-gray-50 border-gray-100 rounded-xl pl-10 pr-4 py-3 font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Beskrivelse</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            className="w-full bg-gray-50 border-gray-100 rounded-xl px-4 py-3 text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none resize-none"
                            placeholder="Mottaker vil se denne teksten..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Kategori</label>
                            <div className="relative">
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value as any)}
                                    className="w-full bg-gray-50 border-gray-100 rounded-xl px-4 py-3 font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none appearance-none"
                                >
                                    <option value="EVENT">Arrangement & Turer</option>
                                    <option value="OTHER">Annet</option>
                                </select>
                                <span className="absolute right-4 top-3.5 pointer-events-none text-gray-400 material-symbols-outlined">expand_more</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Betalingsfrist</label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                                className="w-full bg-gray-50 border-gray-100 rounded-xl px-4 py-3 font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                            />
                        </div>
                    </div>

                    {/* Linking */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Knytt til Arrangement (Valgfritt)</label>
                        <div className="relative">
                            <select
                                value={selectedEventId}
                                onChange={(e) => setSelectedEventId(e.target.value)}
                                className="w-full bg-gray-50 border-gray-100 rounded-xl px-4 py-3 font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none appearance-none"
                            >
                                <option value="">Ingen tilknytning</option>
                                {events.map(ev => (
                                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                                ))}
                            </select>
                            <span className="absolute right-4 top-3.5 pointer-events-none text-gray-400 material-symbols-outlined">expand_more</span>
                        </div>
                        <p className="text-xs text-gray-400 ml-1">Hjelper deg å velge deltakere automatisk.</p>
                    </div>

                    {/* Targeting - Redesigned as Cards */}
                    <div className="pt-8 border-t border-gray-100">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1 mb-4 block">Hvem skal betale?</label>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <button
                                type="button"
                                onClick={() => setTargetType('ALL')}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${targetType === 'ALL'
                                        ? 'border-indigo-600 bg-indigo-50'
                                        : 'border-gray-100 hover:border-indigo-200'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${targetType === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    <span className="material-symbols-outlined">groups</span>
                                </div>
                                <h3 className={`font-bold text-sm ${targetType === 'ALL' ? 'text-indigo-900' : 'text-gray-900'}`}>Alle Medlemmer</h3>
                                <p className="text-xs text-gray-500 mt-1">Send til hele klubben.</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => setTargetType('EVENT_ATTENDEES')}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${targetType === 'EVENT_ATTENDEES'
                                        ? 'border-indigo-600 bg-indigo-50'
                                        : 'border-gray-100 hover:border-indigo-200'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${targetType === 'EVENT_ATTENDEES' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    <span className="material-symbols-outlined">confirmation_number</span>
                                </div>
                                <h3 className={`font-bold text-sm ${targetType === 'EVENT_ATTENDEES' ? 'text-indigo-900' : 'text-gray-900'}`}>Arrangement</h3>
                                <p className="text-xs text-gray-500 mt-1">Kun påmeldte deltakere.</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => setTargetType('MANUAL')}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${targetType === 'MANUAL'
                                        ? 'border-indigo-600 bg-indigo-50'
                                        : 'border-gray-100 hover:border-indigo-200'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${targetType === 'MANUAL' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    <span className="material-symbols-outlined">touch_app</span>
                                </div>
                                <h3 className={`font-bold text-sm ${targetType === 'MANUAL' ? 'text-indigo-900' : 'text-gray-900'}`}>Manuell</h3>
                                <p className="text-xs text-gray-500 mt-1">Velg personer selv.</p>
                            </button>
                        </div>

                        {/* Manual Selection Interface */}
                        {targetType === 'MANUAL' && (
                            <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50/50">
                                <input
                                    type="text"
                                    placeholder="Søk etter medlem..."
                                    value={memberSearch}
                                    onChange={(e) => setMemberSearch(e.target.value)}
                                    className="w-full bg-white border-gray-200 rounded-lg px-4 py-2 text-sm mb-4 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <div className="max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {filteredMembers.map(m => (
                                        <label key={m.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${selectedMemberIds.includes(m.id)
                                                ? 'bg-indigo-50 border-indigo-200'
                                                : 'bg-white border-gray-100 hover:border-indigo-200'
                                            }`}>
                                            <div className="relative flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                                    checked={selectedMemberIds.includes(m.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedMemberIds([...selectedMemberIds, m.id]);
                                                        else setSelectedMemberIds(selectedMemberIds.filter(id => id !== m.id));
                                                    }}
                                                />
                                            </div>
                                            <span className={`text-sm font-medium ${selectedMemberIds.includes(m.id) ? 'text-indigo-900' : 'text-gray-700'}`}>
                                                {m.firstName} {m.lastName}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                {filteredMembers.length === 0 && (
                                    <p className="text-center text-gray-400 text-sm py-2">Ingen medlemmer funnet.</p>
                                )}
                            </div>
                        )}

                        <div className="mt-6 bg-indigo-50 rounded-xl p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Oppsummering</p>
                                <p className="text-sm text-indigo-900 font-medium">Du sender krav til <span className="font-bold">{targetCount}</span> personer.</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Total Inntekt</p>
                                <p className="text-xl font-bold text-indigo-900">{(targetCount * (parseInt(amount) || 0)).toLocaleString()} kr</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-gray-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-black transition-all disabled:opacity-50 shadow-lg shadow-gray-900/20 hover:shadow-gray-900/30 active:scale-95 transform"
                        >
                            {submitting ? 'Oppretter fakturaer...' : 'Send Betalingskrav'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
