"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { useModal } from "@/components/providers/ModalContext";
import { ActionInfo } from "@/components/ui/ActionInfo";
import { revokeInvitation, type Invitation } from "@/server/actions/invitations";
import { inviteMember } from "@/server/actions/invite-member"; // We can reuse the action, but might need a form
import { SERIF, AdminPageHeader, btnPrimary, btnSecondary, card, label, input } from "@/components/admin/ui";

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
            message: `Er du sikker på at du vil trekke tilbake invitasjonen til ${inv.email}?\n\nDette sletter det ventende medlemmet og gjør registreringslenken ugyldig, så personen ikke lenger kan opprette konto.\n\nHandlingen kan ikke angres – du må sende en ny invitasjon for å invitere på nytt.`,
            type: "error",
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
            <AdminPageHeader
                eyebrow="Brukeradministrasjon"
                title="Invitasjoner"
                description="Administrer utsendte invitasjoner og send nye."
                actions={
                    <button onClick={() => setShowInviteModal(true)} className={btnPrimary}>
                        <span className="material-symbols-outlined text-lg">add</span>
                        Inviter ny
                    </button>
                }
            />

            {initialError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {initialError}
                </div>
            )}

            <div className={`${card} overflow-hidden`}>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px]">
                        <thead className="bg-[#faf8f3] text-[11px] font-bold text-gray-400 uppercase tracking-wider text-left border-b border-border-color">
                            <tr>
                                <th className="px-6 py-4 min-w-[340px]">E-post</th>
                                <th className="px-6 py-4 min-w-[150px]">Rolle</th>
                                <th className="px-6 py-4 min-w-[140px]">Status</th>
                                <th className="px-6 py-4 min-w-[150px]">Sendt</th>
                                <th className="px-6 py-4 min-w-[170px] text-right">Handling</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color">
                            {invitations.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm italic" style={{ fontFamily: SERIF }}>
                                        Ingen ventende invitasjoner.
                                    </td>
                                </tr>
                            ) : (
                                invitations.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-black/[0.02] transition-colors">
                                        <td className="px-6 py-4 min-w-[340px] text-sm font-medium text-gray-900 whitespace-nowrap">
                                            {inv.email}
                                        </td>
                                        <td className="px-6 py-4 min-w-[150px] text-sm text-gray-600">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cream text-text-secondary whitespace-nowrap">
                                                {inv.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 min-w-[140px]">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 whitespace-nowrap">
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 min-w-[150px] text-sm text-gray-500 whitespace-nowrap tabular-nums">
                                            {new Date(inv.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 min-w-[170px] text-right">
                                            <button
                                                onClick={() => handleRevoke(inv)}
                                                disabled={loadingId === inv.id}
                                                className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50 whitespace-nowrap"
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
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-border-color shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-2xl font-normal text-gray-900" style={{ fontFamily: SERIF }}>Inviter nytt medlem</h2>
                            <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600 rounded-lg">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleInviteSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={label}>Fornavn</label>
                                    <input
                                        required
                                        type="text"
                                        value={inviteForm.firstName}
                                        onChange={e => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                                        className={input}
                                    />
                                </div>
                                <div>
                                    <label className={label}>Etternavn</label>
                                    <input
                                        required
                                        type="text"
                                        value={inviteForm.lastName}
                                        onChange={e => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                                        className={input}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={label}>E-postadresse</label>
                                <input
                                    required
                                    type="email"
                                    value={inviteForm.email}
                                    onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                                    className={input}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={label}>Rolle</label>
                                    <select
                                        value={inviteForm.role}
                                        onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
                                        className={input}
                                    >
                                        <option value="MEMBER">Medlem</option>
                                        <option value="MODERATOR">Moderator</option>
                                        <option value="ADMIN">Administrator</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={label}>Medlemskap</label>
                                    <select
                                        value={inviteForm.membershipType}
                                        onChange={e => setInviteForm({ ...inviteForm, membershipType: e.target.value })}
                                        className={input}
                                    >
                                        <option value="STANDARD">Standard</option>
                                        <option value="HONORARY">Æresmedlem</option>
                                        <option value="SUPPORT">Støttemedlem</option>
                                    </select>
                                </div>
                            </div>

                            <ActionInfo
                                variant="info"
                                icon="mail"
                                title="Hva skjer når du sender invitasjonen?"
                                items={[
                                    "Personen får en e-post med en registreringslenke, og det opprettes et ventende medlem med rollen og medlemskapstypen du velger.",
                                    "Rollen bestemmer tilgangsnivået etter at de har registrert seg – Administrator og Moderator gir utvidet tilgang.",
                                    "Du kan ikke invitere en e-post som allerede finnes i systemet.",
                                ]}
                            />

                            <div className="flex justify-end gap-3 pt-4 border-t border-border-color mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowInviteModal(false)}
                                    className={btnSecondary}
                                >
                                    Avbryt
                                </button>
                                <button
                                    type="submit"
                                    disabled={inviteLoading}
                                    className={btnPrimary}
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
