"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRoles, deleteRole } from "@/server/actions/roles";
import { useModal } from "@/components/providers/ModalContext";

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
            message: `Er du sikker på at du vil slette rollen "${name}"?`,
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

    if (loading) return <div className="p-8 text-center text-gray-500">Laster roller...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Brukerroller</h1>
                    <p className="text-gray-500 text-sm">Administrer tilgangsnivåer og rettigheter.</p>
                </div>
                <Link href="/admin/system/user-roles/new" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">add</span>
                    Ny Rolle
                </Link>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Navn</th>
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Beskrivelse</th>
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Medlemmer</th>
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Handling</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {roles.map(role => (
                            <tr key={role.id} className="group hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900 flex items-center gap-2">
                                        {role.name}
                                        {role.isSystem && <span className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide border border-gray-200">System</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {role.description || "-"}
                                </td>
                                <td className="px-6 py-4 text-sm text-center">
                                    {role._count.members > 0 ? (
                                        <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-medium text-xs">
                                            {role._count.members}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Link href={`/admin/system/user-roles/${role.id}`} className="text-gray-400 hover:text-indigo-600 p-1 hover:bg-indigo-50 rounded-md transition-colors">
                                            <span className="material-symbols-outlined text-lg">edit</span>
                                        </Link>
                                        {!role.isSystem && role._count.members === 0 && (
                                            <button
                                                onClick={() => handleDelete(role.id, role.name)}
                                                className="text-gray-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-md transition-colors"
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
    );
}
