"use client";

import { useState, useEffect } from "react";
import { useActionState } from "react";
import { deleteMember } from "@/server/actions/delete-member";
import { Role } from "@prisma/client";

type Member = {
    id: string;
    firstName: string | null;
    lastName: string | null;
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
    const [state, formAction, isPending] = useActionState(deleteMember, {});

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
        }
    }, [state.message]);

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8">
            {/* Search Bar */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <label className="block text-sm font-bold text-gray-700 mb-2">Finn medlem</label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input
                            type="text"
                            placeholder="Søk etter navn, e-post..."
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {search && (
                        <button
                            onClick={() => { setSearch(""); setFilteredMembers([]); setSelectedMember(null); }}
                            className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
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
                                className="flex items-center gap-3 p-3 text-left bg-white border border-gray-100 hover:border-indigo-500 hover:shadow-md rounded-xl transition-all group"
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                    {member.firstName?.[0]}{member.lastName?.[0]}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 leading-tight">{member.firstName} {member.lastName}</p>
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
                        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm relative overflow-hidden">
                            <div className="flex justify-between items-start mb-6">
                                <h2 className="text-lg font-bold text-gray-900">Valgt Bruker</h2>
                                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full uppercase tracking-wide">
                                    Aktiv Status
                                </span>
                            </div>

                            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                                {/* Avatar */}
                                <div className="w-32 h-32 rounded-2xl bg-indigo-50 border-4 border-white shadow-xl flex items-center justify-center text-3xl font-bold text-indigo-600 shrink-0">
                                    {selectedMember.firstName?.[0]}{selectedMember.lastName?.[0]}
                                </div>

                                <div className="flex-1 w-full text-center md:text-left">
                                    <h3 className="text-3xl font-bold text-gray-900">{selectedMember.firstName} {selectedMember.lastName}</h3>
                                    <p className="text-gray-500 font-mono text-sm mt-1">Medlemsnummer: #{selectedMember.clerkId?.slice(-6).toUpperCase() ?? "N/A"}</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 text-left">
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">E-post</p>
                                            <p className="font-medium text-gray-900">{selectedMember.email}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Medlem siden</p>
                                            <p className="font-medium text-gray-900">
                                                {new Date(selectedMember.createdAt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Rolle</p>
                                            <p className="font-medium text-gray-900 capitalize">{selectedMember.role.toLowerCase()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Telefon</p>
                                            <p className="font-medium text-gray-900">{selectedMember.phoneNumber || "Ikke registrert"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8">
                            <h4 className="font-bold text-gray-900 mb-4">Oversikt</h4>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                            <span className="material-symbols-outlined text-sm">event_available</span>
                                        </div>
                                        <span className="text-sm font-medium text-gray-600">Påmeldte arrangementer</span>
                                    </div>
                                    <span className="text-lg font-bold text-gray-900">{selectedMember._count?.eventsAttending || 0}</span>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                            <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                                        </div>
                                        <span className="text-sm font-medium text-gray-600">Nåværende saldo</span>
                                    </div>
                                    <span className={`text-lg font-bold ${Number(selectedMember.balance) < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
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

                            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                                Å slette denne brukeren vil fjerne all personlig informasjon fra databasen.
                            </p>

                            <h5 className="font-bold text-gray-900 text-sm mb-3">Hva skjer med dataene?</h5>
                            <ul className="space-y-3 mb-8">
                                {[
                                    "Profilen slettes permanent.",
                                    "Innloggings-tilgang fjernes umiddelbart.",
                                    "Saldo blir trukket fra klubbkontoen.",
                                    "Event-påmeldinger kanselleres."
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-auto space-y-4">
                                <label className="flex items-start gap-3 p-3 bg-white border border-red-100 rounded-xl cursor-pointer hover:border-red-300 transition-colors">
                                    <input
                                        type="checkbox"
                                        className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                        checked={confirmationChecked}
                                        onChange={(e) => setConfirmationChecked(e.target.checked)}
                                    />
                                    <span className="text-xs text-gray-600 font-medium">
                                        Jeg forstår at denne handlingen er permanent og ikke kan angres.
                                    </span>
                                </label>

                                <form action={formAction}>
                                    <input type="hidden" name="memberId" value={selectedMember.id} />
                                    <button
                                        type="submit"
                                        disabled={!confirmationChecked || isPending}
                                        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isPending ? (
                                            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></span>
                                        ) : (
                                            <span className="material-symbols-outlined text-lg">delete_forever</span>
                                        )}
                                        Slett Bruker
                                    </button>
                                </form>

                                <button
                                    onClick={() => setSelectedMember(null)}
                                    className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
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
                    <button onClick={() => state.error = undefined} className="ml-2 opacity-50 hover:opacity-100"><span className="material-symbols-outlined">close</span></button>
                </div>
            )}

            {/* Success Message */}
            {state.message && (
                <div className="fixed bottom-8 right-8 p-4 bg-emerald-600 text-white rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 z-50">
                    <span className="material-symbols-outlined">check_circle</span>
                    {state.message}
                    <button onClick={() => state.message = undefined} className="ml-2 opacity-50 hover:opacity-100"><span className="material-symbols-outlined">close</span></button>
                </div>
            )}
        </div>
    );
}
