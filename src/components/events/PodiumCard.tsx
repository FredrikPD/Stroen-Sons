"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { upsertEventPodium, deleteEventPodium } from "@/server/actions/event-podium";
import type { EventPodiumInput } from "@/lib/validators/event-podium";

type MemberOption = {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
};

type PodiumEntry = {
    place: number;
    teamName: string;
    memberId: string;
    teamMemberIds: string[];
};

type ExistingPodium = {
    type: "INDIVIDUAL" | "TEAM";
    entries: {
        place: number;
        teamName: string | null;
        memberId: string | null;
        teamMembers: { memberId: string }[];
    }[];
};

interface PodiumCardProps {
    recapId?: string | null;
    members: MemberOption[];
    existingPodium?: ExistingPodium | null;
}

const placeLabels: Record<number, { label: string; badge: string }> = {
    1: { label: "1. plass", badge: "bg-[#F5C518] text-[#7a5c00]" },
    2: { label: "2. plass", badge: "bg-[#C0C0C0] text-[#4a4a4a]" },
    3: { label: "3. plass", badge: "bg-[#CD7F32] text-white" },
};

const emptyEntries = (): PodiumEntry[] => [
    { place: 1, teamName: "", memberId: "", teamMemberIds: [] },
    { place: 2, teamName: "", memberId: "", teamMemberIds: [] },
    { place: 3, teamName: "", memberId: "", teamMemberIds: [] },
];

function MemberSelect({
    value,
    onChange,
    members,
    placeholder,
    excludeIds,
}: {
    value: string;
    onChange: (id: string) => void;
    members: MemberOption[];
    placeholder: string;
    excludeIds?: string[];
}) {
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);

    const filtered = members.filter((m) => {
        if (excludeIds?.includes(m.id)) return false;
        if (!search) return true;
        const name = `${m.firstName || ""} ${m.lastName || ""}`.toLowerCase();
        return name.includes(search.toLowerCase());
    });

    const selected = members.find((m) => m.id === value);

    return (
        <div className="relative">
            {value && selected ? (
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 bg-gray-50/40">
                    <Avatar
                        src={selected.avatarUrl}
                        initials={`${selected.firstName?.[0] || ""}${selected.lastName?.[0] || ""}`}
                        size="xs"
                    />
                    <span className="text-sm text-gray-900 flex-1">
                        {selected.firstName} {selected.lastName}
                    </span>
                    <button
                        type="button"
                        onClick={() => { onChange(""); setSearch(""); }}
                        className="text-gray-400 hover:text-red-500"
                    >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                </div>
            ) : (
                <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    placeholder={placeholder}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#4F46E5]"
                />
            )}

            {open && !value && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-400">Ingen treff</div>
                        ) : (
                            filtered.map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => { onChange(m.id); setSearch(""); setOpen(false); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left"
                                >
                                    <Avatar
                                        src={m.avatarUrl}
                                        initials={`${m.firstName?.[0] || ""}${m.lastName?.[0] || ""}`}
                                        size="xs"
                                    />
                                    <span className="text-sm text-gray-900">
                                        {m.firstName} {m.lastName}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

function MemberMultiSelect({
    value,
    onChange,
    members,
}: {
    value: string[];
    onChange: (ids: string[]) => void;
    members: MemberOption[];
}) {
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);

    const selectedMembers = members.filter((m) => value.includes(m.id));
    const filtered = members.filter((m) => {
        if (value.includes(m.id)) return false;
        if (!search) return true;
        const name = `${m.firstName || ""} ${m.lastName || ""}`.toLowerCase();
        return name.includes(search.toLowerCase());
    });

    return (
        <div className="space-y-2">
            {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {selectedMembers.map((m) => (
                        <span
                            key={m.id}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg text-xs text-gray-700"
                        >
                            <Avatar
                                src={m.avatarUrl}
                                initials={`${m.firstName?.[0] || ""}${m.lastName?.[0] || ""}`}
                                size="xs"
                                className="!w-4 !h-4 !text-[8px]"
                            />
                            {m.firstName} {m.lastName}
                            <button
                                type="button"
                                onClick={() => onChange(value.filter((id) => id !== m.id))}
                                className="text-gray-400 hover:text-red-500 ml-0.5"
                            >
                                <span className="material-symbols-outlined text-[12px]">close</span>
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <div className="relative">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    placeholder="Legg til medlem..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#4F46E5]"
                />

                {open && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                        <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            {filtered.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-gray-400">Ingen treff</div>
                            ) : (
                                filtered.map((m) => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => {
                                            onChange([...value, m.id]);
                                            setSearch("");
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left"
                                    >
                                        <Avatar
                                            src={m.avatarUrl}
                                            initials={`${m.firstName?.[0] || ""}${m.lastName?.[0] || ""}`}
                                            size="xs"
                                        />
                                        <span className="text-sm text-gray-900">
                                            {m.firstName} {m.lastName}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export function PodiumCard({ recapId, members, existingPodium }: PodiumCardProps) {
    const [type, setType] = useState<"INDIVIDUAL" | "TEAM">(existingPodium?.type || "INDIVIDUAL");
    const [entries, setEntries] = useState<PodiumEntry[]>(() => {
        if (existingPodium?.entries.length) {
            const mapped = emptyEntries();
            for (const e of existingPodium.entries) {
                const idx = mapped.findIndex((m) => m.place === e.place);
                if (idx !== -1) {
                    mapped[idx] = {
                        place: e.place,
                        teamName: e.teamName || "",
                        memberId: e.memberId || "",
                        teamMemberIds: e.teamMembers.map((tm) => tm.memberId),
                    };
                }
            }
            return mapped;
        }
        return emptyEntries();
    });
    const [saving, setSaving] = useState(false);

    const updateEntry = (place: number, updates: Partial<PodiumEntry>) => {
        setEntries((prev) =>
            prev.map((e) => (e.place === place ? { ...e, ...updates } : e))
        );
    };

    const handleSave = async () => {
        if (!recapId) {
            toast.error("Lagre etterrapporten først");
            return;
        }
        setSaving(true);
        try {
            const filledEntries = entries.filter((e) => {
                if (type === "INDIVIDUAL") return !!e.memberId;
                return !!e.teamName.trim();
            });

            if (filledEntries.length === 0) {
                toast.error("Fyll ut minst én plassering");
                return;
            }

            const payload: EventPodiumInput = {
                type,
                entries: filledEntries.map((e) => ({
                    place: e.place,
                    teamName: type === "TEAM" ? e.teamName : undefined,
                    memberId: type === "INDIVIDUAL" ? e.memberId : undefined,
                    teamMemberIds: type === "TEAM" ? e.teamMemberIds : [],
                })),
            };

            const result = await upsertEventPodium(recapId, payload);
            if (result.success) {
                toast.success("Podium lagret");
            } else {
                toast.error(result.error || "Kunne ikke lagre podium");
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!recapId) return;
        setSaving(true);
        try {
            const result = await deleteEventPodium(recapId);
            if (result.success) {
                setEntries(emptyEntries());
                toast.success("Podium slettet");
            } else {
                toast.error(result.error || "Kunne ikke slette podium");
            }
        } finally {
            setSaving(false);
        }
    };

    const selectedIndividualIds = type === "INDIVIDUAL"
        ? entries.map((e) => e.memberId).filter(Boolean)
        : [];

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#F5C518] text-lg">emoji_events</span>
                    <h3 className="text-base font-bold text-gray-900">Podium</h3>
                </div>
                <div className="flex items-center gap-2">
                    {existingPodium && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={saving}
                            className="px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold disabled:opacity-50"
                        >
                            Slett
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-3 py-2 rounded-lg bg-[#4F46E5] text-white text-xs font-bold hover:bg-[#4338ca] disabled:opacity-50"
                    >
                        {saving ? "Lagrer..." : "Lagre podium"}
                    </button>
                </div>
            </div>

            {/* Type toggle */}
            <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1 w-fit">
                <button
                    type="button"
                    onClick={() => { setType("INDIVIDUAL"); setEntries(emptyEntries()); }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                        type === "INDIVIDUAL" ? "bg-[#4F46E5] text-white" : "text-gray-500 hover:bg-gray-100"
                    }`}
                >
                    Individuelt
                </button>
                <button
                    type="button"
                    onClick={() => { setType("TEAM"); setEntries(emptyEntries()); }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                        type === "TEAM" ? "bg-[#4F46E5] text-white" : "text-gray-500 hover:bg-gray-100"
                    }`}
                >
                    Lag
                </button>
            </div>

            {/* Podium entries */}
            <div className="space-y-4">
                {entries.map((entry) => {
                    const style = placeLabels[entry.place];
                    return (
                        <div key={entry.place} className="rounded-xl border border-gray-200 p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center justify-center size-7 rounded-full text-xs font-bold shadow-sm ${style.badge}`}>
                                    {entry.place}
                                </span>
                                <span className="text-sm font-bold text-gray-700">{style.label}</span>
                            </div>

                            {type === "INDIVIDUAL" ? (
                                <MemberSelect
                                    value={entry.memberId}
                                    onChange={(id) => updateEntry(entry.place, { memberId: id })}
                                    members={members}
                                    placeholder="Søk etter medlem..."
                                    excludeIds={selectedIndividualIds.filter((id) => id !== entry.memberId)}
                                />
                            ) : (
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        value={entry.teamName}
                                        onChange={(e) => updateEntry(entry.place, { teamName: e.target.value })}
                                        placeholder="Lagnavn"
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#4F46E5]"
                                    />
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">
                                            Lagmedlemmer
                                        </label>
                                        <MemberMultiSelect
                                            value={entry.teamMemberIds}
                                            onChange={(ids) => updateEntry(entry.place, { teamMemberIds: ids })}
                                            members={members}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
