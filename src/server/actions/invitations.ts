"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db as prisma } from "@/server/db";

export type Invitation = {
    id: string;
    email: string;
    role: string;
    status: string;
    createdAt: number;
    updatedAt: number;
};

export async function getInvitations() {
    try {
        await ensureRole([Role.ADMIN]);
        const client = await clerkClient();

        const invitations = await client.invitations.getInvitationList({
            status: "pending"
        });

        return {
            success: true,
            invitations: invitations.data.map((inv: any) => ({
                id: inv.id,
                email: inv.emailAddress,
                role: inv.publicMetadata?.role || "MEMBER",
                status: inv.status,
                createdAt: inv.createdAt,
                updatedAt: inv.updatedAt
            }))
        };
    } catch (error) {
        console.error("Failed to fetch invitations:", error);
        return { success: false, error: "Kunne ikke hente invitasjoner." };
    }
}

export async function revokeInvitation(invitationId: string) {
    try {
        await ensureRole([Role.ADMIN]);
        const client = await clerkClient();

        // 1. Get invitation details to find email
        // Note: Clerk SDK might not support fetching a single invitation easily by ID?
        // documentation says .getInvitationList returns list.
        // But we can just iterate the list we have in memory? No, server action is stateless.
        // Let's list pending invitations and find it.
        const invitations = await client.invitations.getInvitationList({ status: "pending" });
        const invitation = invitations.data.find(inv => inv.id === invitationId);

        if (!invitation) {
            return { success: false, error: "Invitasjonen ble ikke funnet." };
        }

        const email = invitation.emailAddress;

        // 2. Delete pending member from DB
        const deletedMember = await prisma.member.deleteMany({
            where: {
                email: email,
                status: "PENDING"
            }
        });

        console.log(`Deleted ${deletedMember.count} pending members for email ${email}`);

        // 3. Revoke in Clerk
        await client.invitations.revokeInvitation(invitationId);

        revalidatePath("/admin/system/invitations");
        return { success: true };
    } catch (error) {
        console.error("Failed to revoke invitation:", error);
        return { success: false, error: "Kunne ikke trekke tilbake invitasjonen." };
    }
}
