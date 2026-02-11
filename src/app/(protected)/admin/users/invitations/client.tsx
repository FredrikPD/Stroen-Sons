"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { useModal } from "@/components/providers/ModalContext";
import { revokeInvitation, type Invitation } from "@/server/actions/invitations";
import { inviteMember } from "@/server/actions/invite-member"; // We can reuse the action, but might need a form

interface Props {
    initialInvitations: Invitation[];
    initialError?: string;
}

export default function InvitationsClientPage({ initialInvitations, initialError }: Props) {
    const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const { openConfirm, openAlert } = useModal();
    const router = useRouter();

    // Invite Modal State
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteForm, setInviteForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        role: "MEMBER",
        membershipType: "STANDARD"
    });
    const [inviteLoading, setInviteLoading] = useState(false);

    const handleRevoke = async (inv: Invitation) => {
        const confirmed = await openConfirm({
            title: "Trekk tilbake invitasjon",
            message: `Er du sikker på at du vil trekke tilbake invitasjonen til ${inv.email}?`,
            type: "warning",
            confirmText: "Trekk tilbake",
            cancelText: "Avbryt"
        });

        if (!confirmed) return;

        setLoadingId(inv.id);
        const res = await revokeInvitation(inv.id);

        if (res.success) {
            setInvitations(prev => prev.filter(i => i.id !== inv.id));
            openAlert({ title: "Suksess", message: "Invitasjonen ble trukket tilbake.", type: "success" });
        } else {
            openAlert({ title: "Feil", message: res.error || "Noe gikk galt.", type: "error" });
        }
        setLoadingId(null);
    };

    const handleInviteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviteLoading(true);

        const formData = new FormData();
        formData.append("firstName", inviteForm.firstName);
        formData.append("lastName", inviteForm.lastName);
        formData.append("email", inviteForm.email);
        formData.append("role", inviteForm.role);
        formData.append("membershipType", inviteForm.membershipType);

        // We are calling the server action directly here, mimicking useFormState but manually handling result
        // Note: inviteMember expects (prevState, formData)
        const res = await inviteMember({}, formData);

        if (res.error) {
            openAlert({ title: "Feil", message: res.error, type: "error" });
        } else {
            await openAlert({ title: "Suksess", message: res.message || "Invitasjon sendt!", type: "success" });
            setShowInviteModal(false);
            setInviteForm({ firstName: "", lastName: "", email: "", role: "MEMBER", membershipType: "STANDARD" });
            router.refresh(); // Refresh to potentially show new invite if Clerk returns it immediately
        }
        setInviteLoading(false);
    };

    return (
        <div className="space-y-6">


            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Invitasjoner</h1>
                    <p className="text-gray-500 text-sm">Administrer utsendte invitasjoner og send nye.</p>
                </div>
                <button
                    onClick={() => setShowInviteModal(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Inviter ny
                </button>
            </div>

            {initialError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {initialError}
                </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-widest text-left">
                        <tr>
                            <th className="px-6 py-4">E-post</th>
                            <th className="px-6 py-4">Rolle</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Sendt</th>
                            <th className="px-6 py-4 text-right">Handling</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {invitations.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm italic">
                                    Ingen ventende invitasjoner.
                                </td>
                            </tr>
                        ) : (
                            invitations.map((inv) => (
                                <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        {inv.email}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                            {inv.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(inv.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleRevoke(inv)}
                                            disabled={loadingId === inv.id}
                                            className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                                        >
                                            {loadingId === inv.id ? "Working..." : "Trekk tilbake"}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Inviter nytt medlem</h2>
                            <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleInviteSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fornavn</label>
                                    <input
                                        required
                                        type="text"
                                        value={inviteForm.firstName}
                                        onChange={e => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Etternavn</label>
                                    <input
                                        required
                                        type="text"
                                        value={inviteForm.lastName}
                                        onChange={e => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">E-postadresse</label>
                                <input
                                    required
                                    type="email"
                                    value={inviteForm.email}
                                    onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
                                    <select
                                        value={inviteForm.role}
                                        onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                    >
                                        <option value="MEMBER">Medlem</option>
                                        <option value="MODERATOR">Moderator</option>
                                        <option value="ADMIN">Administrator</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Medlemskap</label>
                                    <select
                                        value={inviteForm.membershipType}
                                        onChange={e => setInviteForm({ ...inviteForm, membershipType: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                    >
                                        <option value="STANDARD">Standard</option>
                                        <option value="HONORARY">Æresmedlem</option>
                                        <option value="SUPPORT">Støttemedlem</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowInviteModal(false)}
                                    className="px-4 py-2 text-gray-700 font-medium text-sm hover:bg-gray-100 rounded-lg transition"
                                >
                                    Avbryt
                                </button>
                                <button
                                    type="submit"
                                    disabled={inviteLoading}
                                    className="px-4 py-2 bg-indigo-600 text-white font-medium text-sm rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                                >
                                    {inviteLoading ? (
                                        <>
                                            <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span>
                                            Sender...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-sm">send</span>
                                            Send invitasjon
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
