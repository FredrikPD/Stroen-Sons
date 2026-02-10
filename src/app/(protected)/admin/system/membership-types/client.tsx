"use strict";
"use client";

import { useState } from "react";
import { MembershipTypeWithCount, createMembershipType, updateMembershipType, deleteMembershipType } from "@/server/actions/membership-types";
import { useModal } from "@/components/providers/ModalContext";
import PageTitleUpdater from "@/components/layout/PageTitleUpdater";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Medlemstyper</h1>
                    <p className="text-gray-500">Administrer medlemskapstyper og deres kontingenter.</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    Ny Type
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Navn</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Beskrivelse</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kontingent (Månedlig)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Medlemmer</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Handlinger</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {initialTypes.map((type) => (
                            <tr key={type.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{type.name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">{type.description || "-"}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{type.fee.toLocaleString("no-NO")} kr</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {type._count.members}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => handleEdit(type)}
                                        className="text-indigo-600 hover:text-indigo-900 mr-4 font-bold"
                                    >
                                        Rediger
                                    </button>
                                    <button
                                        onClick={() => handleDelete(type)}
                                        className="text-red-600 hover:text-red-900 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <div className="p-8 text-center text-gray-500">
                        Ingen medlemstyper funnet.
                    </div>
                )}
            </div>

            {/* Custom Modal for Form */}
            {isFormOpen && (
                <div className="fixed inset-0 z-[1000] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
                        <div className="fixed inset-0 bg-gray-900/40 transition-opacity" onClick={() => setIsFormOpen(false)} aria-hidden="true" />

                        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                                <h3 className="text-lg font-bold leading-6 text-gray-900 mb-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Navn</label>
                <input
                    name="name"
                    defaultValue={initialData?.name}
                    required
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    placeholder="F.eks. STUDENT"
                />
                {initialData && (
                    <p className="text-xs text-amber-600 mt-1">
                        Advarsel: Endring av navn vil oppdatere alle medlemmer med denne typen.
                    </p>
                )}
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse</label>
                <input
                    name="description"
                    defaultValue={initialData?.description || ""}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    placeholder="Beskrivelse av typen"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Årlig Kontingent (kr)</label>
                <input
                    name="fee"
                    type="number"
                    defaultValue={initialData?.fee ?? 750}
                    required
                    min="0"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50"
                >
                    Avbryt
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                    {loading ? "Lagrer..." : (initialData ? "Lagre Endringer" : "Opprett")}
                </button>
            </div>
        </form>
    );
}
