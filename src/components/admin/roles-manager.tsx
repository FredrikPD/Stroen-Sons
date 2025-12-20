'use client';

import { useState, useEffect } from 'react';
import { getMembers, updateMemberRole, updateMemberType } from '@/actions/admin-roles';
import { Role } from '@prisma/client';
import { Avatar } from '@/components/Avatar';

interface Member {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: Role;
    membershipType: string;
    clerkId: string;
}

export default function RolesManager() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        const fetchMembers = async () => {
            const result = await getMembers();
            if (result.success && result.data) {
                setMembers(result.data);
            }
            setLoading(false);
        };
        fetchMembers();
    }, []);

    const filteredMembers = members.filter(member => {
        const query = searchQuery.toLowerCase();
        const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
        return fullName.includes(query) || member.email.toLowerCase().includes(query);
    });

    const handleRoleChange = async (memberId: string, newRole: Role) => {
        setUpdatingId(memberId);
        const result = await updateMemberRole(memberId, newRole);
        if (result.success) {
            setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m));
        } else {
            alert('Failed to update role');
        }
        setUpdatingId(null);
    };

    const handleTypeChange = async (memberId: string, newType: string) => {
        setUpdatingId(memberId);
        const result = await updateMemberType(memberId, newType);
        if (result.success) {
            setMembers(members.map(m => m.id === memberId ? { ...m, membershipType: newType } : m));
        } else {
            alert('Failed to update membership type');
        }
        setUpdatingId(null);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
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
                                            value={member.role}
                                            onChange={(e) => handleRoleChange(member.id, e.target.value as Role)}
                                            disabled={updatingId === member.id}
                                            className={`block w-full pl-3 pr-10 py-2 border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md ${member.role === 'ADMIN'
                                                ? 'text-red-700 font-medium bg-red-50 border-red-200'
                                                : 'text-emerald-700 font-medium bg-emerald-50 border-emerald-200'
                                                }`}
                                        >
                                            <option value="MEMBER">Medlem</option>
                                            <option value="ADMIN">Administrator</option>
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
                                            <option value="STANDARD">Standard</option>
                                            <option value="HONORARY">Æresmedlem</option>
                                            <option value="TRIAL">Prøvemedlem</option>
                                            <option value="SUPPORT">Støttemedlem</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {updatingId === member.id ? (
                                            <span className="text-indigo-600 flex items-center justify-end gap-1">
                                                <span className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></span>
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
