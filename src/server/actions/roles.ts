"use server";

import { prisma } from "@/server/db";
import { ensureRole } from "@/server/auth/ensureRole";
import { syncClerkRoleMetadata } from "@/server/clerk/syncRoleMetadata";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function getRoles() {
    try {
        await ensureRole([Role.ADMIN]);
        const roles = await prisma.userRole.findMany({
            orderBy: { name: "asc" },
            include: { _count: { select: { members: true } } }
        });
        return { success: true, roles };
    } catch (e) {
        return { success: false, error: "Kunne ikke hente roller." };
    }
}

export async function getRole(id: string) {
    try {
        await ensureRole([Role.ADMIN]);
        const role = await prisma.userRole.findUnique({
            where: { id },
        });
        if (!role) return { success: false, error: "Rolle ikke funnet." };
        return { success: true, role };
    } catch (e) {
        return { success: false, error: "Kunne ikke hente rolle." };
    }
}

export async function createRole(data: { name: string; description?: string; allowedPaths: string[] }) {
    try {
        await ensureRole([Role.ADMIN]);

        const existing = await prisma.userRole.findUnique({ where: { name: data.name } });
        if (existing) return { success: false, error: "En rolle med dette navnet finnes allerede." };

        const role = await prisma.userRole.create({
            data: {
                name: data.name,
                description: data.description,
                allowedPaths: data.allowedPaths,
            }
        });

        revalidatePath("/admin/system/roles");
        return { success: true, role };
    } catch (e) {
        console.error(e);
        return { success: false, error: "Kunne ikke opprette rolle." };
    }
}

export async function updateRole(id: string, data: { name: string; description?: string; allowedPaths: string[] }) {
    try {
        await ensureRole([Role.ADMIN]);

        const role = await prisma.userRole.findUnique({ where: { id } });
        if (!role) return { success: false, error: "Rolle ikke funnet." };

        // Prevent modification of system roles (except maybe description/paths? No, keep it safe)
        // Actually, migration script set isSystem=true for default roles.
        // We SHOULD allow modifying allowedPaths for system roles, but maybe not name?
        // Let's allow everything for now, Admin knows best.

        await prisma.userRole.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                allowedPaths: data.allowedPaths,
            }
        });

        revalidatePath("/admin/system/roles");
        return { success: true, role };
    } catch (e) {
        console.error(e);
        return { success: false, error: "Kunne ikke oppdatere rolle." };
    }
}

export async function deleteRole(id: string) {
    try {
        await ensureRole([Role.ADMIN]);

        const role = await prisma.userRole.findUnique({ where: { id }, include: { _count: { select: { members: true } } } });
        if (!role) return { success: false, error: "Rolle ikke funnet." };

        if (role.isSystem) return { success: false, error: "Kan ikke slette systemroller." };
        if (role._count.members > 0) return { success: false, error: "Kan ikke slette rolle som har medlemmer." };

        await prisma.userRole.delete({ where: { id } });

        revalidatePath("/admin/system/user-roles");
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: "Kunne ikke slette rolle." };
    }
}

export async function assignRole(memberId: string, roleId: string) {
    try {
        await ensureRole([Role.ADMIN]);

        const role = await prisma.userRole.findUnique({ where: { id: roleId } });
        if (!role) return { success: false, error: "Rolle ikke funnet." };

        // Reset legacy enum if necessary? 
        // Logic: specific roles -> specific enum?
        // Admin -> ADMIN
        // Moderator -> MODERATOR
        // Others -> MEMBER
        let legacyRole: Role = Role.MEMBER;
        if (role.name === "Admin") legacyRole = Role.ADMIN;
        if (role.name === "Moderator") legacyRole = Role.MODERATOR;

        const updatedMember = await prisma.member.update({
            where: { id: memberId },
            data: {
                userRoleId: roleId,
                role: legacyRole // Sync legacy enum for backward compatibility
            },
            select: {
                clerkId: true,
            },
        });

        const clerkSyncResult = await syncClerkRoleMetadata({
            clerkId: updatedMember.clerkId,
            roleId: role.id,
            legacyRole,
        });

        revalidatePath("/admin/users");
        revalidatePath("/admin/users/roles");

        if (!clerkSyncResult.success && !clerkSyncResult.skipped) {
            return { success: true, warning: clerkSyncResult.error };
        }

        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: "Kunne ikke tildele rolle." };
    }
}
