"use client";

import { useState, useEffect } from "react";
import { useModal } from "@/components/providers/ModalContext";
import { getEventParticipants, adminAddParticipant, adminRemoveParticipant, getAllEventsForParticipation } from "@/server/actions/event-participation";
import { getMembers } from "@/server/actions/members";
import { Avatar } from "@/components/Avatar";
import { LoadingState } from "@/components/ui/LoadingState";

export default function EventParticipationClientPage() {
    const { openAlert, openConfirm } = useModal();
    const [loading, setLoading] = useState(true);

    const [events, setEvents] = useState<any[]>([]);
    const [selectedEventId, setSelectedEventId] = useState("");

    // Participants
    const [participants, setParticipants] = useState<any[]>([]);
    const [pLoading, setPLoading] = useState(false);

    // Add Member
    const [allMembers, setAllMembers] = useState<any[]>([]);
    const [memberSearch, setMemberSearch] = useState("");
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        Promise.all([
            getAllEventsForParticipation(),
            getMembers()
        ]).then(([eventsRes, membersRes]) => {
            if (eventsRes.success && eventsRes.events) {
                setEvents(eventsRes.events);
            } else {
                setEvents([]);
            }
            if (membersRes.success && membersRes.data) {
                setAllMembers(membersRes.data);
            }
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        if (!selectedEventId) {
            setParticipants([]);
            return;
        }

        setPLoading(true);
        getEventParticipants(selectedEventId).then(res => {
            if (res.success && res.participants) {
                setParticipants(res.participants);
            }
            setPLoading(false);
        });
    }, [selectedEventId]);

    const handleAdd = async (memberId: string) => {
        const confirmed = await openConfirm({
            title: "Legg til deltaker",
            message: "Dette vil melde medlemmet PÅ arrangementet, uavhengig av frister. Er du sikker?",
            type: "warning",
            confirmText: "Legg til"
        });

        if (!confirmed) return;

        setAdding(true);
        const res = await adminAddParticipant(selectedEventId, memberId);

        if (res.success) {
            // Refresh list
            const updated = await getEventParticipants(selectedEventId);
            if (updated.success && updated.participants) {
                setParticipants(updated.participants);
            }
            await openAlert({ title: "Suksess", message: "Medlem lagt til.", type: "success" });
            setMemberSearch(""); // Clear search to reset view
        } else {
            await openAlert({ title: "Feil", message: res.error || "Kunne ikke legge til.", type: "error" });
        }
        setAdding(false);
    };

    const handleRemove = async (memberId: string, name: string) => {
        const confirmed = await openConfirm({
            title: "Fjern deltaker",
            message: `Er du sikker på at du vil fjerne ${name} fra arrangementet?`,
            type: "warning",
            confirmText: "Fjern"
        });

        if (!confirmed) return;

        setAdding(true); // Re-use loading state
        const res = await adminRemoveParticipant(selectedEventId, memberId);

        if (res.success) {
            setParticipants(prev => prev.filter(p => p.id !== memberId));
            await openAlert({ title: "Suksess", message: "Medlem fjernet.", type: "success" });
        } else {
            await openAlert({ title: "Feil", message: res.error || "Kunne ikke fjerne.", type: "error" });
        }
        setAdding(false);
    };

    if (loading) return <LoadingState />;

    const filteredMembers = allMembers.filter(m =>
        !participants.some(p => p.id === m.id) &&
        (m.firstName + " " + m.lastName).toLowerCase().includes(memberSearch.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Administrer Påmeldinger</h1>
                <p className="text-gray-500">Meld medlemmer av/på arrangementer manuelt.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Velg Arrangement</label>
                <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">-- Velg --</option>
                    {events.map(e => (
                        <option key={e.id} value={e.id}>
                            {e.title} ({new Date(e.startAt).toLocaleDateString()})
                        </option>
                    ))}
                </select>
            </div>

            {selectedEventId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* List Existing */}
                    <div>
                        <h3 className="font-bold text-gray-900 mb-4 flex justify-between items-center">
                            <span>Påmeldte ({participants.length})</span>
                            {pLoading && <span className="text-xs text-gray-400">Oppdaterer...</span>}
                        </h3>

                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-h-[500px] overflow-y-auto">
                            {participants.length === 0 ? (
                                <p className="p-4 text-center text-gray-400 text-sm">Ingen påmeldte.</p>
                            ) : (
                                participants.map(p => (
                                    <div key={p.id} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            <Avatar initials={p.firstName[0] + (p.lastName[0] || "")} />
                                            <span className="text-sm font-medium">{p.firstName} {p.lastName}</span>
                                        </div>
                                        <button
                                            onClick={() => handleRemove(p.id, p.firstName)}
                                            disabled={adding}
                                            className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1 rounded bg-red-50 hover:bg-red-100"
                                        >
                                            Fjern
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Add New */}
                    <div>
                        <h3 className="font-bold text-gray-900 mb-4">Legg til deltaker</h3>
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <input
                                type="text"
                                placeholder="Søk etter medlem..."
                                value={memberSearch}
                                onChange={(e) => setMemberSearch(e.target.value)}
                                className="w-full p-2 mb-4 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            />

                            <div className="max-h-[400px] overflow-y-auto space-y-2">
                                {memberSearch === "" ? (
                                    <p className="text-center text-gray-400 text-xs py-4">Søk for å finne medlemmer.</p>
                                ) : filteredMembers.length === 0 ? (
                                    <p className="text-center text-gray-400 text-xs py-4">Ingen treff.</p>
                                ) : (
                                    filteredMembers.map(m => (
                                        <div key={m.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                                    {m.firstName[0]}
                                                </div>
                                                <span className="text-sm">{m.firstName} {m.lastName}</span>
                                            </div>
                                            <button
                                                onClick={() => handleAdd(m.id)}
                                                disabled={adding}
                                                className="text-indigo-600 hover:text-indigo-800 text-xs font-bold"
                                            >
                                                + Legg til
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
