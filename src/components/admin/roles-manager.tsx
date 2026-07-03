"use client";

import { useState, useEffect } from 'react';
import { getAvailableRoles, getMembers, updateMemberRole, updateMemberType } from '@/server/actions/admin-roles';
import { getMembershipTypes, MembershipTypeWithCount } from '@/server/actions/membership-types';
import { Role } from '@prisma/client';
import { Avatar } from '@/components/Avatar';
import { LoadingState } from '@/components/ui/LoadingState';
import { card, input } from '@/components/admin/ui';

interface AvailableRole {
    id: string;
    name: string;
}

interface Member {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    email: string;
    role: Role;
    userRole?: AvailableRole | null;
    membershipType: string;
    clerkId: string | null;
}

function mapUserRoleNameToLegacyRole(roleName: string): Role {
    const normalizedRoleName = roleName.trim().toLowerCase();
    if (normalizedRoleName === "admin") {
        return "ADMIN";
    }
    if (normalizedRoleName === "moderator") {
        return "MODERATOR";
    }
    return "MEMBER";
}

export default function RolesManager() {
    const [members, setMembers] = useState<Member[]>([]);
    const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
    const [membershipTypes, setMembershipTypes] = useState<MembershipTypeWithCount[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [membersRes, typesRes, rolesRes] = await Promise.all([
                    getMembers(),
                    getMembershipTypes(),
                    getAvailableRoles(),
                ]);

                if (membersRes.success && membersRes.data) {
                    const normalizedMembers = membersRes.data.map((member: any) => ({
                        id: member.id,
                        firstName: member.firstName,
                        lastName: member.lastName,
                        avatarUrl: member.avatarUrl ?? null,
                        email: member.email,
                        role: member.role,
                        userRole: member.userRole ?? null,
                        membershipType: member.membershipType,
                        clerkId: member.clerkId,
                    }));
                    setMembers(normalizedMembers);
                } else if (membersRes.error) {
                    alert(membersRes.error);
                }

                if (typesRes.success && typesRes.data) {
                    setMembershipTypes(typesRes.data);
                } else if (typesRes.error) {
                    alert(typesRes.error);
                }

                if (rolesRes.success && rolesRes.data) {
                    setAvailableRoles(rolesRes.data);
                } else if (rolesRes.error) {
                    alert(rolesRes.error);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredMembers = members.filter(member => {
        const query = searchQuery.toLowerCase();
        const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
        return fullName.includes(query) || member.email.toLowerCase().includes(query);
    });

    const handleRoleChange = async (memberId: string, newRoleId: string) => {
        setUpdatingId(memberId);
        const result = await updateMemberRole(memberId, newRoleId);
        if (result.success) {
            const selectedRole = availableRoles.find((role) => role.id === newRoleId) ?? null;
            setMembers((prevMembers) => prevMembers.map((member) =>
                member.id === memberId
                    ? {
                        ...member,
                        role: selectedRole ? mapUserRoleNameToLegacyRole(selectedRole.name) : member.role,
                        userRole: selectedRole,
                    }
                    : member
            ));

            if (result.warning) {
                alert(result.warning);
            }
        } else {
            alert(result.error || 'Kunne ikke oppdatere rolle');
        }
        setUpdatingId(null);
    };

    const handleTypeChange = async (memberId: string, newType: string) => {
        setUpdatingId(memberId);
        const result = await updateMemberType(memberId, newType);
        if (result.success) {
            setMembers((prevMembers) => prevMembers.map((member) =>
                member.id === memberId ? { ...member, membershipType: newType } : member
            ));
        } else {
            alert(result.error || 'Kunne ikke oppdatere medlemstype');
        }
        setUpdatingId(null);
    };

    if (loading) {
        return <LoadingState className="h-64" />;
    }

    return (
        <div className="space-y-6">
            <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${card} p-4`}>
                <div className="relative w-full sm:max-w-md">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                        <span className="material-symbols-outlined text-gray-400">search</span>
                    </span>
                    <input
                        type="text"
                        placeholder="Søk etter medlem..."
                        className={`${input} pl-10`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="self-start sm:self-auto text-xs sm:text-sm text-text-secondary bg-cream border border-border-color rounded-lg px-3 py-1.5 font-medium tabular-nums whitespace-nowrap">
                    Viser {filteredMembers.length} av {members.length} medlemmer
                </div>
            </div>

            <div className={`${card} overflow-hidden`}>
                <div className="overflow-x-auto">
                    <table className="min-w-[980px] w-full divide-y divide-border-color">
                        <thead className="bg-[#faf8f3]">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider min-w-[360px]">
                                    Medlem
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider min-w-[220px]">
                                    Rolle
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider min-w-[240px]">
                                    Medlemstype
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wider min-w-[150px]">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-border-color">
                            {filteredMembers.map((member) => (
                                <tr key={member.id} className="hover:bg-black/[0.02] transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap min-w-[360px]">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <Avatar
                                                    className="h-10 w-10 rounded-full"
                                                    src={member.avatarUrl}
                                                    initials={`${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`}
                                                />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                                                    {member.firstName} {member.lastName}
                                                </div>
                                                <div className="text-sm text-gray-500 whitespace-nowrap">{member.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap min-w-[220px]">
                                        <select
                                            value={member.userRole?.id || ''}
                                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                            disabled={updatingId === member.id}
                                            className={`block w-full min-w-[190px] pl-3 pr-10 py-2 sm:text-sm rounded-md border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${member.userRole?.name === 'Admin'
                                                ? 'text-primary font-medium bg-primary/15 border-primary/20'
                                                : member.userRole?.name === 'Moderator'
                                                    ? 'text-primary font-medium bg-primary/10 border-primary/20'
                                                    : 'text-text-secondary font-medium bg-cream border-border-color'
                                                }`}
                                        >
                                            {!member.userRole && <option value="">Velg rolle...</option>}
                                            {availableRoles.map((role) => (
                                                <option key={role.id} value={role.id}>
                                                    {role.name}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap min-w-[240px]">
                                        <select
                                            value={member.membershipType}
                                            onChange={(e) => handleTypeChange(member.id, e.target.value)}
                                            disabled={updatingId === member.id}
                                            className={`block w-full min-w-[210px] pl-3 pr-10 py-2 text-base sm:text-sm rounded-md border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${member.membershipType === 'HONORARY' ? 'text-amber-700 font-medium bg-amber-50 border-amber-200' :
                                                member.membershipType === 'TRIAL' ? 'text-primary font-medium bg-primary/10 border-primary/20' :
                                                    member.membershipType === 'SUPPORT' ? 'text-text-secondary font-medium bg-cream border-border-color' :
                                                        'text-emerald-700 font-medium bg-emerald-50 border-emerald-200'
                                                }`}
                                        >
                                            {membershipTypes.map(type => (
                                                <option key={type.id} value={type.name}>
                                                    {type.name} ({type.fee} kr)
                                                </option>
                                            ))}
                                            {/* Fallback if member has a type not in DB? */}
                                            {!membershipTypes.find(t => t.name === member.membershipType) && (
                                                <option value={member.membershipType}>{member.membershipType} (Ukjent)</option>
                                            )}
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap min-w-[150px] text-right text-sm font-medium">
                                        {updatingId === member.id ? (
                                            <span className="text-primary flex items-center justify-end gap-1">
                                                <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></span>
                                                Lagrer...
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">Oppdatert</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
