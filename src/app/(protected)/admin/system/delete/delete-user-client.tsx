"use client";

import { useState, useEffect, useTransition } from "react";
import { deleteMember } from "@/server/actions/delete-member";
import { Role } from "@prisma/client";
import { useModal } from "@/components/providers/ModalContext";
import { Avatar } from "@/components/Avatar";
import { ActionInfo } from "@/components/ui/ActionInfo";
import { SERIF, card, btnSecondary, btnDanger, label, input } from "@/components/admin/ui";

type Member = {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    email: string;
    role: Role;
    clerkId: string | null;
    createdAt: Date;
    phoneNumber: string | null;
    balance: number;
    _count: { eventsAttending: number };
};

export default function DeleteUserClient({ initialMembers }: { initialMembers: Member[] }) {
    const [search, setSearch] = useState("");
    const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [confirmationChecked, setConfirmationChecked] = useState(false);

    // Replacement for useActionState to allow manual invocation
    const [state, setState] = useState<{ message?: string; error?: string }>({});
    const [isPending, startTransition] = useTransition();

    const { openConfirm, openAlert } = useModal();

    // Search effect
    useEffect(() => {
        if (!search) {
            setFilteredMembers([]);
            return;
        }
        const lower = search.toLowerCase();
        setFilteredMembers(initialMembers.filter(m =>
            (m.firstName?.toLowerCase().includes(lower) || "") ||
            (m.lastName?.toLowerCase().includes(lower) || "") ||
            m.email.toLowerCase().includes(lower)
        ));
    }, [search, initialMembers]);

    // Reset when action succeeds
    useEffect(() => {
        if (state.message) {
            setSelectedMember(null);
            setConfirmationChecked(false);
            setSearch("");
            // Clear message after 3 seconds
            const timer = setTimeout(() => setState({}), 3000);
            return () => clearTimeout(timer);
        }
    }, [state.message]);

    const handleDelete = async () => {
        if (!selectedMember) return;

        const confirmed = await openConfirm({
            title: "Slett Bruker",
            message: `Er du sikker på at du vil deaktivere ${selectedMember.firstName} ${selectedMember.lastName}? Innlogging fjernes og personlig data anonymiseres.`,
            type: "error",
            confirmText: "Slett Bruker",
            cancelText: "Avbryt"
        });

        if (!confirmed) return;

        startTransition(async () => {
            const formData = new FormData();
            formData.append("memberId", selectedMember.id);

            try {
                // Call server action manually
                const result = await deleteMember({}, formData);
                setState(result);

                if (result.error) {
                    await openAlert({
                        title: "Feil",
                        message: result.error,
                        type: "error"
                    });
                }
            } catch (e) {
                console.error(e);
                setState({ error: "En uventet feil oppstod." });
                await openAlert({
                    title: "Feil",
                    message: "En uventet feil oppstod.",
                    type: "error"
                });
            }
        });
    };

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8">
            {/* Search Bar */}
            <div className={`${card} p-6`}>
                <label className={label}>Finn medlem</label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10">search</span>
                        <input
                            type="text"
                            placeholder="Søk etter navn, e-post..."
                            className={`${input} pl-11`}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {search && (
                        <button
                            onClick={() => { setSearch(""); setFilteredMembers([]); setSelectedMember(null); }}
                            className={`${btnSecondary} h-11`}
                        >
                            Nullstill
                        </button>
                    )}
                </div>

                {/* Search Results Dropdown/List when searching but no user selected */}
                {!selectedMember && search && filteredMembers.length > 0 && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2">
                        {filteredMembers.map(member => (
                            <button
                                key={member.id}
                                onClick={() => setSelectedMember(member)}
                                className="flex items-center gap-3 p-3 text-left bg-white border border-border-color hover:border-primary/50 hover:shadow-sm rounded-xl transition-all group"
                            >
                                <Avatar
                                    src={member.avatarUrl}
                                    initials={`${member.firstName?.[0] || ""}${member.lastName?.[0] || ""}`}
                                    alt={member.firstName || member.email}
                                    className="w-10 h-10 text-gray-600 font-bold bg-cream group-hover:bg-primary/10 group-hover:text-primary transition-colors"
                                    size="sm"
                                />
                                <div>
                                    <p className="font-semibold text-gray-900 leading-tight">{member.firstName} {member.lastName}</p>
                                    <p className="text-xs text-gray-500">{member.email}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
                {!selectedMember && search && filteredMembers.length === 0 && (
                    <p className="mt-4 text-sm text-gray-400">Ingen treff funnet.</p>
                )}
            </div>

            {/* Selected User View - 2 Columns */}
            {selectedMember && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* LEFT COL: User Details */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className={`${card} p-8 relative overflow-hidden`}>
                            <div className="flex justify-between items-start mb-6">
                                <h2 className="text-xl font-normal text-gray-900" style={{ fontFamily: SERIF }}>Valgt Bruker</h2>
                                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full uppercase tracking-wide">
                                    Aktiv Status
                                </span>
                            </div>

                            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                                {/* Avatar */}
                                <Avatar
                                    src={selectedMember.avatarUrl}
                                    initials={`${selectedMember.firstName?.[0] || ""}${selectedMember.lastName?.[0] || ""}`}
                                    alt={selectedMember.firstName || selectedMember.email}
                                    className="w-32 h-32 rounded-2xl text-3xl font-bold text-primary bg-primary/10 border-4 border-white shadow-md shrink-0"
                                    size="lg"
                                />

                                <div className="flex-1 w-full text-center md:text-left">
                                    <h3 className="text-3xl font-normal text-gray-900" style={{ fontFamily: SERIF }}>{selectedMember.firstName} {selectedMember.lastName}</h3>
                                    <p className="text-gray-500 font-mono text-sm mt-1">Medlemsnummer: #{selectedMember.clerkId?.slice(-6).toUpperCase() ?? "N/A"}</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 text-left">
                                        <div>
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-1">E-post</p>
                                            <p className="font-medium text-gray-900">{selectedMember.email}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-1">Medlem siden</p>
                                            <p className="font-medium text-gray-900">
                                                {new Date(selectedMember.createdAt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-1">Rolle</p>
                                            <p className="font-medium text-gray-900 capitalize">{selectedMember.role.toLowerCase()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-1">Telefon</p>
                                            <p className="font-medium text-gray-900">{selectedMember.phoneNumber || "Ikke registrert"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-cream/40 border border-border-color rounded-2xl p-8">
                            <h4 className="text-lg font-normal text-gray-900 mb-4" style={{ fontFamily: SERIF }}>Oversikt</h4>
                            <div className="space-y-4">
                                <div className={`${card} flex items-center justify-between p-3`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                            <span className="material-symbols-outlined text-sm">event_available</span>
                                        </div>
                                        <span className="text-sm font-medium text-gray-600">Påmeldte arrangementer</span>
                                    </div>
                                    <span className="text-lg font-normal text-gray-900 tabular-nums" style={{ fontFamily: SERIF }}>{selectedMember._count?.eventsAttending || 0}</span>
                                </div>

                                <div className={`${card} flex items-center justify-between p-3`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                            <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                                        </div>
                                        <span className="text-sm font-medium text-gray-600">Nåværende saldo</span>
                                    </div>
                                    <span className={`text-lg font-normal tabular-nums ${Number(selectedMember.balance) < 0 ? 'text-red-600' : 'text-emerald-700'}`} style={{ fontFamily: SERIF }}>
                                        {new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK" }).format(Number(selectedMember.balance) || 0)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COL: Danger Zone */}
                    <div className="lg:col-span-1">
                        <div className="bg-red-50/50 border border-red-100 rounded-2xl p-6 h-full flex flex-col">
                            <div className="flex items-center gap-2 mb-4 text-red-600">
                                <span className="material-symbols-outlined">warning</span>
                                <span className="font-bold uppercase tracking-wider text-sm">Danger Zone</span>
                            </div>

                            <ActionInfo
                                variant="danger"
                                title="Hva skjer med dataene?"
                                className="mb-8"
                                items={[
                                    "Innloggingen fjernes fra Clerk, og medlemmet kan ikke logge inn igjen.",
                                    "Personlig data (e-post, telefon, adresse) anonymiseres. Navnet beholdes i regnskap, resultater og arrangementer.",
                                    "Hele faktura- og betalingshistorikken til medlemmet slettes permanent (ikke bare anonymisert).",
                                    "Har medlemmet positiv saldo, betales den ut og trekkes fra klubbkontoen. Skylder medlemmet penger (negativ saldo), avskrives gjelden.",
                                    "Månedskontingent settes på pause, så det lages ingen nye fakturaer.",
                                    "Ingen varsling sendes til medlemmet.",
                                ]}
                            >
                                <p className="font-bold text-red-900">Dette kan ikke angres.</p>
                            </ActionInfo>

                            <div className="mt-auto space-y-4">
                                <label className="flex items-start gap-3 p-3 bg-white border border-red-100 rounded-xl cursor-pointer hover:border-red-300 transition-colors">
                                    <input
                                        type="checkbox"
                                        className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                        checked={confirmationChecked}
                                        onChange={(e) => setConfirmationChecked(e.target.checked)}
                                    />
                                    <span className="text-xs text-gray-600 font-medium">
                                        Jeg forstår at innlogging fjernes og personlig data anonymiseres.
                                    </span>
                                </label>

                                <button
                                    onClick={handleDelete}
                                    disabled={!confirmationChecked || isPending}
                                    className={`${btnDanger} w-full h-11`}
                                >
                                    {isPending ? (
                                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white"></span>
                                    ) : (
                                        <span className="material-symbols-outlined text-lg">delete_forever</span>
                                    )}
                                    Slett Bruker
                                </button>

                                <button
                                    onClick={() => setSelectedMember(null)}
                                    className={`${btnSecondary} w-full h-11`}
                                >
                                    Avbryt handling
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {state.error && (
                <div className="fixed bottom-8 right-8 p-4 bg-red-600 text-white rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 z-50">
                    <span className="material-symbols-outlined">error</span>
                    {state.error}
                    <button onClick={() => setState({})} className="ml-2 opacity-50 hover:opacity-100"><span className="material-symbols-outlined">close</span></button>
                </div>
            )}

            {/* Success Message */}
            {state.message && (
                <div className="fixed bottom-8 right-8 p-4 bg-emerald-600 text-white rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 z-50">
                    <span className="material-symbols-outlined">check_circle</span>
                    {state.message}
                    <button onClick={() => setState({})} className="ml-2 opacity-50 hover:opacity-100"><span className="material-symbols-outlined">close</span></button>
                </div>
            )}
        </div>
    );
}
