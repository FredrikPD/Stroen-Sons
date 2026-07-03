"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRoles, deleteRole } from "@/server/actions/roles";
import { useModal } from "@/components/providers/ModalContext";
import { LoadingState } from "@/components/ui/LoadingState";
import { AdminPageHeader, AdminEmptyState, btnPrimary, card, SERIF } from "@/components/admin/ui";

type RoleWithCount = {
    id: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    _count: { members: number };
};

export default function RolesClientPage() {
    const { openConfirm, openAlert } = useModal();
    const [roles, setRoles] = useState<RoleWithCount[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRoles();
    }, []);

    const loadRoles = async () => {
        setLoading(true);
        const res = await getRoles();
        if (res.success && res.roles) {
            // @ts-ignore - DB type vs Client type mismatch if count is not in type definition? 
            // Prisma returns generic object, we cast it.
            setRoles(res.roles as any);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string, name: string) => {
        const confirmed = await openConfirm({
            title: "Slett Rolle",
            message: `Er du sikker på at du vil slette rollen "${name}"?\n\nSletter rollen permanent - dette kan ikke angres. Du kan bare slette egendefinerte roller som ikke har noen medlemmer; systemroller og roller i bruk kan ikke slettes. Ingen medlemmer eller varsler påvirkes.`,
            type: "warning",
            confirmText: "Slett"
        });

        if (!confirmed) return;

        const res = await deleteRole(id);
        if (res.success) {
            setRoles(prev => prev.filter(r => r.id !== id));
            await openAlert({ title: "Slettet", message: "Rollen ble slettet.", type: "success" });
        } else {
            await openAlert({ title: "Feil", message: res.error || "Kunne ikke slette rolle.", type: "error" });
        }
    };

    if (loading) {
        return <LoadingState />;
    }

    return (
        <div>
            <AdminPageHeader
                eyebrow="System"
                title="Brukerroller"
                description="Administrer tilgangsnivåer og rettigheter."
                actions={
                    <Link href="/admin/system/user-roles/new" className={btnPrimary}>
                        <span className="material-symbols-outlined text-lg">add</span>
                        Ny Rolle
                    </Link>
                }
            />

            {roles.length === 0 ? (
                <AdminEmptyState icon="shield_person">Ingen roller opprettet ennå.</AdminEmptyState>
            ) : (
                <div className={`${card} overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#faf8f3] border-b border-border-color">
                                <tr>
                                    <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Navn</th>
                                    <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Beskrivelse</th>
                                    <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">Medlemmer</th>
                                    <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Handling</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-color">
                                {roles.map(role => (
                                    <tr key={role.id} className="group hover:bg-black/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900 flex items-center gap-2" style={{ fontFamily: SERIF }}>
                                                {role.name}
                                                {role.isSystem && <span className="bg-cream text-text-secondary text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide border border-border-color">System</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text-secondary">
                                            {role.description || "-"}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-center">
                                            {role._count.members > 0 ? (
                                                <span className="bg-cream text-text-secondary px-2 py-1 rounded-md font-medium text-xs tabular-nums">
                                                    {role._count.members}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`/admin/system/user-roles/${role.id}`} className="text-gray-400 hover:text-primary p-1 hover:bg-primary/10 rounded-lg transition-colors">
                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                </Link>
                                                {!role.isSystem && role._count.members === 0 && (
                                                    <button
                                                        onClick={() => handleDelete(role.id, role.name)}
                                                        className="text-gray-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">delete</span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
