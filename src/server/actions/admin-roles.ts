'use server';

import { ensureRole } from "@/server/auth/ensureRole";
import { syncClerkRoleMetadata } from "@/server/clerk/syncRoleMetadata";
import { db } from "@/server/db";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

function mapUserRoleNameToLegacyRole(roleName: string): Role {
    const normalizedRoleName = roleName.trim().toLowerCase();
    if (normalizedRoleName === "admin") {
        return Role.ADMIN;
    }
    if (normalizedRoleName === "moderator") {
        return Role.MODERATOR;
    }
    return Role.MEMBER;
}

export async function getMembers() {
    try {
        await ensureRole([Role.ADMIN]);

        const members = await db.member.findMany({
            select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                email: true,
                role: true,
                userRole: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                membershipType: true,
                clerkId: true,
            },
            orderBy: {
                firstName: 'asc',
            },
        });
        return { success: true, data: members };
    } catch (error) {
        console.error("Error fetching members:", error);
        return { success: false, error: "Failed to fetch members" };
    }
}

export async function getAvailableRoles() {
    try {
        await ensureRole([Role.ADMIN]);

        const roles = await db.userRole.findMany({
            orderBy: { name: "asc" },
            select: {
                id: true,
                name: true,
            }
        });

        return { success: true, data: roles };
    } catch (error) {
        console.error("Error fetching roles:", error);
        return { success: false, error: "Kunne ikke hente roller" };
    }
}

export async function updateMemberRole(memberId: string, roleId: string) {
    try {
        await ensureRole([Role.ADMIN]);

        if (!roleId) {
            return { success: false, error: "Ugyldig rolle" };
        }

        const userRole = await db.userRole.findUnique({
            where: { id: roleId },
            select: {
                id: true,
                name: true,
            },
        });

        if (!userRole) {
            return { success: false, error: "Rolle ikke funnet" };
        }

        const updatedMember = await db.member.update({
            where: { id: memberId },
            data: {
                role: mapUserRoleNameToLegacyRole(userRole.name),
                userRoleId: userRole.id,
            },
            select: {
                clerkId: true,
            },
        });

        const clerkSyncResult = await syncClerkRoleMetadata({
            clerkId: updatedMember.clerkId,
            roleId: userRole.id,
            legacyRole: mapUserRoleNameToLegacyRole(userRole.name),
        });

        revalidatePath('/admin/users');
        revalidatePath('/admin/users/roles');

        if (!clerkSyncResult.success && !clerkSyncResult.skipped) {
            return { success: true, warning: clerkSyncResult.error };
        }

        return { success: true };
    } catch (error) {
        console.error("Error updating member role:", error);
        return { success: false, error: "Kunne ikke oppdatere rolle" };
    }
}

export async function updateMemberType(memberId: string, newType: string) {
    try {
        await ensureRole([Role.ADMIN]);

        const membershipType = await db.membershipType.findUnique({
            where: { name: newType },
            select: { name: true },
        });

        if (!membershipType) {
            return { success: false, error: "Ugyldig medlemstype" };
        }

        await db.member.update({
            where: { id: memberId },
            data: { membershipType: membershipType.name },
        });

        revalidatePath('/admin/users');
        revalidatePath('/admin/users/roles');
        return { success: true };
    } catch (error) {
        console.error("Error updating member type:", error);
        return { success: false, error: "Kunne ikke oppdatere medlemstype" };
    }
}
