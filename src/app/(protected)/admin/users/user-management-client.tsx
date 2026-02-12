"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Role } from "@prisma/client";
import { assignRole } from "@/server/actions/roles";
import { useModal } from "@/components/providers/ModalContext";
import { useRouter } from "next/navigation";

type Member = {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: Role;
    userRole: { id: string; name: string } | null;
    membershipType: string;
    status: string;
    lastActive: string;
    avatarInitial: string;
};

// Quick Actions Data
const QUICK_ACTIONS = [
    {
        title: "Inviter Nye Brukere",
        description: "Send invitasjon via e-post",
        icon: "person_add",
        href: "/admin/users/invite",
        colorClass: "text-[#4F46E5] bg-[#4F46E5]/10 group-hover:bg-[#4F46E5] group-hover:text-white",
        hoverBorder: "hover:border-[#4F46E5]/50"
    },
    {
        title: "Endre Medlemsroller",
        description: "Oppdater tilganger",
        icon: "admin_panel_settings",
        href: "/admin/users/roles",
        colorClass: "text-purple-500 bg-purple-500/10 group-hover:bg-purple-500 group-hover:text-white",
        hoverBorder: "hover:border-purple-500/50"
    },
    {
        title: "Håndter invitasjoner",
        description: "Administrer invitasjoner",
        icon: "send",
        href: "/admin/users/invitations",
        colorClass: "text-amber-500 bg-amber-500/10 group-hover:bg-amber-500 group-hover:text-white",
        hoverBorder: "hover:border-amber-500/50"
    }
];

export default function UserManagementClient({ members, availableRoles }: { members: Member[], availableRoles: { id: string, name: string }[] }) {
    const { openAlert, openConfirm } = useModal();
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
    const pageSize = 10;

    const filteredMembers = useMemo(() => {
        const lower = search.toLowerCase();
        return members.filter(m =>
            (m.firstName?.toLowerCase() || "").includes(lower) ||
            (m.lastName?.toLowerCase() || "").includes(lower) ||
            m.email.toLowerCase().includes(lower) ||
            (m.userRole?.name.toLowerCase() || "").includes(lower) ||
            m.role.toLowerCase().includes(lower)
        );
    }, [members, search]);

    const totalPages = Math.ceil(filteredMembers.length / pageSize);
    const paginatedMembers = filteredMembers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Reset page on search
    if (search && currentPage !== 1 && filteredMembers.length < (currentPage - 1) * pageSize) {
        setCurrentPage(1);
    }

    const handleRoleChange = async (memberName: string, memberId: string, newRoleId: string) => {
        // Find role name for confirmation
        const roleName = availableRoles.find(r => r.id === newRoleId)?.name || "Standard Medlem";

        const confirmed = await openConfirm({
            title: "Endre Rolle",
            message: `Vil du endre rollen til ${memberName} til "${roleName}"?`,
            type: "info",
            confirmText: "Endre"
        });

        if (!confirmed) return;

        setUpdatingRoleId(memberId);
        const res = await assignRole(memberId, newRoleId);
        setUpdatingRoleId(null);

        if (res.success) {
            await openAlert({ title: "Oppdatert", message: "Rollen ble endret.", type: "success" });
            router.refresh();
        } else {
            await openAlert({ title: "Feil", message: res.error || "Kunne ikke endre rolle.", type: "error" });
        }
    };

    return (
        <div className="space-y-8">
            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Hurtighandlinger</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {QUICK_ACTIONS.map((action) => (
                        <Link
                            key={action.title}
                            href={action.href}
                            className={`bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-between group transition-all shadow-sm hover:shadow-md ${action.hoverBorder}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${action.colorClass}`}>
                                    <span className="material-symbols-outlined text-xl">{action.icon}</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-sm">{action.title}</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">{action.description}</p>
                                </div>
                            </div>
                            <span className="material-symbols-outlined text-gray-300 group-hover:text-gray-600 transition-colors">chevron_right</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* User List */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Nylig Aktive Brukere</h2>
                    {/* Search Input Could Go Here */}
                    <input
                        type="text"
                        placeholder="Søk..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Bruker</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Rolle</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Type</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Sist Aktiv</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {paginatedMembers.map((member) => (
                                    <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                {/* Avatar */}
                                                <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 font-bold shrink-0">
                                                    {member.avatarInitial}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{member.firstName ? `${member.firstName} ${member.lastName || ""}` : "Ukjent"}</p>
                                                    <p className="text-xs text-gray-500">{member.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            {/* Role Dropdown */}
                                            <div className="relative">
                                                <select
                                                    disabled={updatingRoleId === member.id}
                                                    value={member.userRole?.id || ""}
                                                    onChange={(e) => handleRoleChange(
                                                        member.firstName || member.email,
                                                        member.id,
                                                        e.target.value
                                                    )}
                                                    className={`
                                                        w-full appearance-none pl-3 pr-8 py-1 rounded-full text-xs font-bold border-0 cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500 transition-colors
                                                        ${member.userRole?.name === 'Admin' ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' :
                                                            member.userRole?.name === 'Moderator' ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' :
                                                                'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                                                    `}
                                                >
                                                    {/* If user has no role, we can show a placeholder or map to "Member" role if exists */}
                                                    {!member.userRole && <option value="">Velg rolle...</option>}
                                                    {availableRoles.map(role => (
                                                        <option key={role.id} value={role.id} className="bg-white text-gray-900 font-normal">
                                                            {role.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                                </div>
                                                {updatingRoleId === member.id && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                                                        <span className="w-4 h-4 border-2 border-[#4F46E5]/25 border-t-[#4F46E5] rounded-full animate-spin"></span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="text-sm font-medium text-gray-900">
                                                {member.membershipType === 'STANDARD' ? 'Standard' :
                                                    member.membershipType === 'HONORARY' ? 'Æresmedlem' :
                                                        member.membershipType === 'TRIAL' ? 'Prøvemedlem' :
                                                            member.membershipType === 'SUPPORT' ? 'Støttemedlem' :
                                                                member.membershipType}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${member.status === 'ACTIVE' ? 'bg-green-50 text-green-700' :
                                                member.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                                                    'bg-gray-50 text-gray-700'
                                                }`}>
                                                {member.status === 'ACTIVE' ? 'Aktiv' : member.status === 'PENDING' ? 'Ventende' : member.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-gray-500">
                                            {member.lastActive}
                                        </td>
                                    </tr>
                                ))}
                                {paginatedMembers.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-gray-500 text-sm">
                                            Ingen medlemmer funnet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="py-4 px-6 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                            Viser {Math.min((currentPage - 1) * pageSize + 1, filteredMembers.length)}-{Math.min(currentPage * pageSize, filteredMembers.length)} av {filteredMembers.length} brukere
                        </p>
                        <div className="flex gap-2">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Forrige
                            </button>
                            <button
                                disabled={currentPage === totalPages || totalPages === 0}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Neste
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
