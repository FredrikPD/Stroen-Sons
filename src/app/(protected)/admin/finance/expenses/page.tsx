"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { getMembersAndEvents, registerExpense, getCurrentMember } from "@/server/actions/finance";
import { Avatar } from "@/components/Avatar";

type Member = {
    id: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
};

type Event = {
    id: string;
    title: string;
    startAt: Date;
};

export default function ExpensesPage() {
    const [currentMember, setCurrentMember] = useState<Member | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            const member = await getCurrentMember();
            if (!member || member.role !== "ADMIN") {
                router.push("/dashboard");
                return;
            }
            // Cast to Member type if needed or rely on minimal compatibility
            setCurrentMember(member as unknown as Member);
            setAuthLoading(false);
        };
        checkAuth();
    }, [router]);

    const [members, setMembers] = useState<Member[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [amount, setAmount] = useState<string>("");
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("Mat & Drikke");
    const [selectedEventId, setSelectedEventId] = useState<string>("");

    // Split State
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [query, setQuery] = useState("");



    useEffect(() => {
        const fetchData = async () => {
            if (!currentMember || currentMember.role !== "ADMIN") return;
            const { members, events } = await getMembersAndEvents();
            setMembers(members);
            setEvents(events);
            setLoading(false);
        };

        if (!authLoading) {
            fetchData();
        }
    }, [currentMember, authLoading]);

    const handleToggleMember = (id: string) => {
        if (selectedMemberIds.includes(id)) {
            setSelectedMemberIds(prev => prev.filter(mId => mId !== id));
        } else {
            setSelectedMemberIds(prev => [...prev, id]);
        }
    };

    const handleSelectAll = (select: boolean) => {
        if (select) {
            setSelectedMemberIds(filteredMembers.map(m => m.id));
        } else {
            setSelectedMemberIds([]);
        }
    };

    const handleSubmit = async () => {
        if (!amount || !description) return;
        setSubmitting(true);

        const res = await registerExpense({
            amount: Number(amount),
            date: new Date(date),
            description,
            category,
            eventId: selectedEventId || undefined,
            splitMemberIds: selectedMemberIds
        });

        if (res.success) {
            router.push("/admin/finance");
        } else {
            alert("Noe gikk galt: " + res.error);
        }
        setSubmitting(false);
    };

    // Filter members for the list
    const filteredMembers = members.filter(m => {
        const name = `${m.firstName || ""} ${m.lastName || ""}`.toLowerCase();
        return name.includes(query.toLowerCase());
    });

    // Derived stats
    const totalAmount = Number(amount) || 0;
    const splitCount = selectedMemberIds.length;
    const amountPerPerson = splitCount > 0 ? totalAmount / splitCount : 0;

    if (authLoading || loading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!currentMember || currentMember.role !== "ADMIN") return null;

    return (
        <div className="w-full space-y-4 pb-20">
            <Link href="/admin/finance" className="inline-flex items-center text-gray-500 hover:text-gray-900 transition-colors font-medium text-sm">
                <span className="material-symbols-outlined mr-1 text-[1.2rem]">arrow_back</span>
                Tilbake til oversikt
            </Link>

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Bokfør Utgifter</h1>
                <p className="text-gray-500 text-xs">
                    Registrer nye utgifter for arrangementer og fordel kostnadene automatisk.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left Column: Transaction Details */}
                <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden min-h-[600px]">
                    <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400 text-xl">receipt_long</span>
                        Transaksjonsdetaljer
                    </h2>

                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Beløp (NOK)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm font-medium rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                        placeholder="0"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-xs">kr</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Dato</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm font-medium rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Beskrivelse</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm font-medium rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                placeholder="Eks. Middag på Villa Paradiso"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Kategori</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm font-medium rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none"
                            >
                                <option>Mat & Drikke</option>
                                <option>Transport</option>
                                <option>Leie av lokale</option>
                                <option>Utstyr</option>
                                <option>Annet</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Arrangement (Valgritt)</label>
                            <select
                                value={selectedEventId}
                                onChange={(e) => setSelectedEventId(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm font-medium rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none"
                            >
                                <option value="">Ingen arrangement</option>
                                {events.map(event => (
                                    <option key={event.id} value={event.id}>
                                        {event.title} ({new Date(event.startAt).toLocaleDateString('nb-NO')})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Upload Placeholder */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Last opp kvittering (Valgfritt)</label>
                            <div className="border border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer group">
                                <span className="material-symbols-outlined text-2xl mb-1 group-hover:scale-110 transition-transform">upload_file</span>
                                <span className="text-[10px] font-medium">Klikk eller dra fil hit</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Member Split */}
                {/* Right Column: Member Split */}
                <div className="relative h-[500px] lg:h-auto">
                    <div className="absolute inset-0 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-gray-400 text-xl">groups</span>
                                Fordeling
                            </h2>
                            <div className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                                VALGT: {selectedMemberIds.length}
                            </div>
                        </div>

                        <div className="p-3 border-b border-gray-100 bg-white">
                            <div className="relative mb-3">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Søk etter medlem..."
                                    className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                            </div>
                            <div className="flex justify-between items-center px-1">
                                <span className="text-xs font-medium text-gray-500">Velg alle</span>
                                <button
                                    onClick={() => handleSelectAll(selectedMemberIds.length !== filteredMembers.length)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${selectedMemberIds.length === filteredMembers.length && filteredMembers.length > 0 ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${selectedMemberIds.length === filteredMembers.length && filteredMembers.length > 0 ? 'translate-x-4' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                            {filteredMembers.map(member => (
                                <div
                                    key={member.id}
                                    onClick={() => handleToggleMember(member.id)}
                                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${selectedMemberIds.includes(member.id) ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-gray-50 border border-transparent'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar src={null} alt={member.firstName || ""} size="sm" className="w-8 h-8 text-xs" />
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{member.firstName} {member.lastName}</p>
                                            <p className="text-[10px] text-gray-500 capitalize">{member.role.toLowerCase()}</p>
                                        </div>
                                    </div>
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedMemberIds.includes(member.id) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'}`}>
                                        {selectedMemberIds.includes(member.id) && <span className="material-symbols-outlined text-white text-[10px] font-bold">check</span>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-gray-50 border-t border-gray-100 mt-auto">
                            <div className="flex justify-between items-center mb-1 text-xs text-gray-500">
                                <span>Totalt beløp</span>
                                <span className="font-medium text-gray-900">{new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK" }).format(totalAmount)}</span>
                            </div>
                            <div className="flex justify-between items-center mb-3 text-xs text-gray-500">
                                <span>Fordelt på</span>
                                <span className="font-medium text-gray-900">{splitCount} medlemmer</span>
                            </div>
                            <div className="pt-3 border-t border-gray-200">
                                <div className="flex justify-between items-end mb-3">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">TOTAL PER PERS</span>
                                    <span className="text-2xl font-bold text-gray-900">{new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(amountPerPerson)}</span>
                                </div>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || !amount || selectedMemberIds.length === 0}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg font-bold text-sm text-white transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-95"
                                >
                                    {submitting ? "Lagrer..." : "Bokfør Utgift"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
