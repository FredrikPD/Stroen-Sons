"use strict";
"use client";

import { useState } from "react";
import { MembershipTypeWithCount, createMembershipType, updateMembershipType, deleteMembershipType } from "@/server/actions/membership-types";
import { useModal } from "@/components/providers/ModalContext";
import { ActionInfo } from "@/components/ui/ActionInfo";
import PageTitleUpdater from "@/components/layout/PageTitleUpdater";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AdminPageHeader, SERIF, btnPrimary, btnSecondary, label, input } from "@/components/admin/ui";

export default function MembershipTypesClient({ initialTypes }: { initialTypes: MembershipTypeWithCount[] }) {
    const [types, setTypes] = useState(initialTypes);
    const { openConfirm } = useModal();
    const router = useRouter();

    // Local state for Add/Edit Modal
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingType, setEditingType] = useState<MembershipTypeWithCount | undefined>(undefined);

    const handleCreate = () => {
        setEditingType(undefined);
        setIsFormOpen(true);
    };

    const handleEdit = (type: MembershipTypeWithCount) => {
        setEditingType(type);
        setIsFormOpen(true);
    };

    const handleFormSubmit = async (data: { name: string; description: string; fee: number }) => {
        let res;
        if (editingType) {
            res = await updateMembershipType(editingType.id, data);
        } else {
            res = await createMembershipType(data);
        }

        if (res.success) {
            toast.success(editingType ? "Medlemstype oppdatert" : "Medlemstype opprettet");
            setIsFormOpen(false);
            setEditingType(undefined);
            router.refresh();
        } else {
            toast.error(res.error);
        }
    };

    const handleDelete = (type: MembershipTypeWithCount) => {
        openConfirm({
            title: "Slett Medlemstype",
            message: `Er du sikker på at du vil slette "${type.name}"? Dette kan ikke angres.`,
            type: "warning",
            confirmText: "Slett",
            cancelText: "Avbryt"
        }).then(async (confirmed) => {
            if (confirmed) {
                const res = await deleteMembershipType(type.id);
                if (res.success) {
                    toast.success("Medlemstype slettet");
                    router.refresh();
                } else {
                    toast.error(res.error);
                }
            }
        });
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
            <PageTitleUpdater title="Medlemstyper" backHref="/admin/system" backLabel="System" />

            <AdminPageHeader
                eyebrow="Medlemspleie"
                title="Medlemstyper"
                description="Administrer medlemskapstyper og deres kontingenter."
                actions={
                    <button onClick={handleCreate} className={btnPrimary}>
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Ny Type
                    </button>
                }
            />

            <div className="bg-white border border-border-color rounded-2xl overflow-hidden">
                <table className="min-w-full divide-y divide-border-color">
                    <thead className="bg-[#faf8f3]">
                        <tr>
                            <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Navn</th>
                            <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Beskrivelse</th>
                            <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Kontingent (Månedlig)</th>
                            <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Medlemmer</th>
                            <th className="px-6 py-3 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wider">Handlinger</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color bg-white">
                        {initialTypes.map((type) => (
                            <tr key={type.id} className="hover:bg-black/[0.02] transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{type.name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-text-secondary">{type.description || "-"}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 tabular-nums">{type.fee.toLocaleString("no-NO")} kr</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cream text-text-secondary tabular-nums">
                                        {type._count.members}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => handleEdit(type)}
                                        className="text-primary hover:text-primary-hover mr-4 font-semibold transition-colors"
                                    >
                                        Rediger
                                    </button>
                                    <button
                                        onClick={() => handleDelete(type)}
                                        className="text-red-600 hover:text-red-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        disabled={type._count.members > 0}
                                        title={type._count.members > 0 ? "Kan ikke slette type som er i bruk" : ""}
                                    >
                                        Slett
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {initialTypes.length === 0 && (
                    <div className="p-8 text-center text-sm text-gray-400 italic" style={{ fontFamily: SERIF }}>
                        Ingen medlemstyper funnet.
                    </div>
                )}
            </div>

            {/* Custom Modal for Form */}
            {isFormOpen && (
                <div className="fixed inset-0 z-[1000] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
                        <div className="fixed inset-0 bg-black/40 transition-opacity" onClick={() => setIsFormOpen(false)} aria-hidden="true" />

                        <div className="relative transform overflow-hidden rounded-2xl bg-white border border-border-color text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                                <h3 className="text-xl font-normal leading-6 text-gray-900 mb-4" style={{ fontFamily: SERIF }}>
                                    {editingType ? "Rediger Medlemstype" : "Ny Medlemstype"}
                                </h3>
                                <MembershipTypeForm
                                    initialData={editingType}
                                    onSubmit={handleFormSubmit}
                                    onCancel={() => setIsFormOpen(false)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MembershipTypeForm({
    initialData,
    onSubmit,
    onCancel
}: {
    initialData?: MembershipTypeWithCount,
    onSubmit: (data: { name: string; description: string; fee: number }) => Promise<void>,
    onCancel: () => void
}) {
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);

        await onSubmit({
            name: formData.get("name") as string,
            description: formData.get("description") as string || "",
            fee: Number(formData.get("fee"))
        });

        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
                <label className={label}>Navn</label>
                <input
                    name="name"
                    defaultValue={initialData?.name}
                    required
                    className={input}
                    placeholder="F.eks. STUDENT"
                />
                {initialData && (
                    <p className="text-xs text-amber-600 mt-1.5">
                        Advarsel: Endring av navn vil oppdatere alle medlemmer med denne typen.
                    </p>
                )}
            </div>
            <div>
                <label className={label}>Beskrivelse</label>
                <input
                    name="description"
                    defaultValue={initialData?.description || ""}
                    className={input}
                    placeholder="Beskrivelse av typen"
                />
            </div>
            <div>
                <label className={label}>Årlig Kontingent (kr)</label>
                <input
                    name="fee"
                    type="number"
                    defaultValue={initialData?.fee ?? 750}
                    required
                    min="0"
                    className={input}
                />
                {initialData ? (
                    <ActionInfo variant="info" compact>
                        Endrer du kontingenten, gjelder den nye summen bare for krav som genereres framover. Krav som allerede er laget, beholder sitt opprinnelige beløp og må eventuelt rettes manuelt.
                    </ActionInfo>
                ) : (
                    <ActionInfo variant="info" compact>
                        Kontingenten du setter her blir beløpet som brukes neste gang det genereres kontingentkrav for medlemmer med denne typen. Ingen krav opprettes akkurat nå, og eksisterende krav endres ikke.
                    </ActionInfo>
                )}
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className={btnSecondary}
                >
                    Avbryt
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className={btnPrimary}
                >
                    {loading ? "Lagrer..." : (initialData ? "Lagre Endringer" : "Opprett")}
                </button>
            </div>
        </form>
    );
}
