"use client";

import { useState, useEffect } from 'react';
import { getAvailableRoles, getMembers, updateMemberRole, updateMemberType } from '@/actions/admin-roles';
import { getMembershipTypes, MembershipTypeWithCount } from '@/server/actions/membership-types';
import { Role } from '@prisma/client';
import { Avatar } from '@/components/Avatar';
import { LoadingState } from '@/components/ui/LoadingState';

interface AvailableRole {
    id: string;
    name: string;
}

interface Member {
    id: string;
    firstName: string | null;
    lastName: string | null;
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
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="relative w-full max-w-md">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-gray-400">search</span>
                    </span>
                    <input
                        type="text"
                        placeholder="Søk etter medlem..."
                        className="pl-10 block w-full rounded-lg border-gray-300 border bg-gray-50 focus:bg-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="text-sm text-gray-500">
                    Viser {filteredMembers.length} av {members.length} medlemmer
                </div>
            </div>

            <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Medlem
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Rolle
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Medlemstype
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredMembers.map((member) => (
                                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <Avatar
                                                    className="h-10 w-10 rounded-full"
                                                    initials={`${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`}
                                                />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {member.firstName} {member.lastName}
                                                </div>
                                                <div className="text-sm text-gray-500">{member.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <select
                                            value={member.userRole?.id || ''}
                                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                            disabled={updatingId === member.id}
                                            className={`block w-full pl-3 pr-10 py-2 border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md ${member.userRole?.name === 'Admin'
                                                ? 'text-purple-700 font-medium bg-purple-100 border-purple-200'
                                                : member.userRole?.name === 'Moderator'
                                                    ? 'text-indigo-700 font-medium bg-indigo-100 border-indigo-200'
                                                    : 'text-gray-700 font-medium bg-gray-100 border-gray-200'
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
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <select
                                            value={member.membershipType}
                                            onChange={(e) => handleTypeChange(member.id, e.target.value)}
                                            disabled={updatingId === member.id}
                                            className={`block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md ${member.membershipType === 'HONORARY' ? 'text-amber-700 font-medium bg-amber-50 border-amber-200' :
                                                member.membershipType === 'TRIAL' ? 'text-orange-700 font-medium bg-orange-50 border-orange-200' :
                                                    member.membershipType === 'SUPPORT' ? 'text-pink-700 font-medium bg-pink-50 border-pink-200' :
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
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {updatingId === member.id ? (
                                            <span className="text-indigo-600 flex items-center justify-end gap-1">
                                                <span className="w-4 h-4 border-2 border-[#4F46E5]/25 border-t-[#4F46E5] rounded-full animate-spin"></span>
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
