'use server';

import { db } from "@/server/db";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function getMembers() {
    try {
        const members = await db.member.findMany({
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
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

export async function updateMemberRole(memberId: string, newRole: Role) {
    try {
        await db.member.update({
            where: { id: memberId },
            data: { role: newRole },
        });
        revalidatePath('/admin/users/roles');
        return { success: true };
    } catch (error) {
        console.error("Error updating member role:", error);
        return { success: false, error: "Failed to update member role" };
    }
}

export async function updateMemberType(memberId: string, newType: string) {
    try {
        await db.member.update({
            where: { id: memberId },
            data: { membershipType: newType },
        });
        revalidatePath('/admin/users/roles');
        return { success: true };
    } catch (error) {
        console.error("Error updating member type:", error);
        return { success: false, error: "Failed to update member type" };
    }
}
