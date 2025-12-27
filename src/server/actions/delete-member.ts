"use server";

import { db } from "@/server/db";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export type DeleteMemberState = {
    message?: string;
    error?: string;
};

export async function deleteMember(
    prevState: DeleteMemberState,
    formData: FormData
): Promise<DeleteMemberState> {
    const memberId = formData.get("memberId") as string;

    if (!memberId) {
        return { error: "Ingen medlems-ID oppgitt." };
    }

    try {
        // 1. Fetch member to get Clerk ID
        const member = await db.member.findUnique({
            where: { id: memberId },
        });

        if (!member) {
            return { error: "Fant ikke medlemmet i databasen." };
        }

        // 2. Delete from Clerk
        if (member.clerkId) {
            const client = await clerkClient();
            try {
                await client.users.deleteUser(member.clerkId);
            } catch (clerkError: any) {
                const isNotFound =
                    clerkError?.status === 404 ||
                    clerkError?.errors?.[0]?.code === "resource_not_found";

                if (isNotFound) {
                    console.log("Member not found in Clerk (already deleted?), continuing to delete from database.");
                } else {
                    console.error("Failed to delete Clerk user:", clerkError);
                }
            }
        }

        // 3. Clean up related records (Prisma doesn't cascade all of these)

        // Financial records
        await db.paymentRequest.deleteMany({ where: { memberId } });
        await db.payment.deleteMany({ where: { memberId } });

        // Keep transactions for accounting, but unlink the member
        await db.transaction.updateMany({
            where: { memberId },
            data: { memberId: null },
        });

        // Handle balance payout if positive
        // We do this BEFORE unlinking the member from transactions (above is updateMany, but we want to create a new one)
        // Actually, the above unlinks OLD transactions. We want to add a FINAL transaction.
        // Prisma Decimal to number conversion
        const balance = Number(member.balance);
        if (balance > 0) {
            await db.transaction.create({
                data: {
                    amount: -balance, // Negative to reduce treasury
                    description: `Utbetaling av saldo ved utmelding: ${member.firstName} ${member.lastName}`,
                    category: "MEMBER_EXIT",
                    date: new Date(),
                    memberId: null, // User is being deleted, so we don't link it (or link it then it gets unlinked? easier to just set null or store name in description)
                    // If we link it to memberId, we must ensure it's not deleted by cascade (transactions usually aren't).
                    // But we are about to delete the member.
                    // The best approach: Create transaction with memberId = null immediately, but description contains the name.
                },
            });
        }

        // Social content & Events
        // We attempt to transfer ownership of Posts and Events to another admin to preserve history.

        // Find another admin to inherit content
        const otherAdmin = await db.member.findFirst({
            where: {
                role: "ADMIN",
                id: { not: memberId },
            },
        });

        // 1. Handle Posts
        const postsCount = await db.post.count({
            where: { authorId: memberId },
        });

        if (postsCount > 0) {
            if (otherAdmin) {
                // Transfer posts to the other admin
                await db.post.updateMany({
                    where: { authorId: memberId },
                    data: { authorId: otherAdmin.id },
                });
            } else {
                // Fallback: Delete posts if no other admin exists
                await db.post.deleteMany({
                    where: { authorId: memberId },
                });
            }
        }

        // 2. Handle Comments
        // We always delete comments authored by the user, as attributing personal comments
        // to another admin would be confusing/impersonation.
        await db.comment.deleteMany({ where: { authorId: memberId } });

        // 3. Handle Events
        const eventsCount = await db.event.count({
            where: { createdById: memberId },
        });

        if (eventsCount > 0) {
            if (otherAdmin) {
                await db.event.updateMany({
                    where: { createdById: memberId },
                    data: { createdById: otherAdmin.id },
                });
            } else {
                // If no other admin (edge case), delete the events
                await db.event.deleteMany({
                    where: { createdById: memberId },
                });
            }
        }

        // 4. Delete from Prisma
        await db.member.delete({
            where: { id: memberId },
        });

        revalidatePath("/admin/roles"); // Revalidate roles page just in case
        revalidatePath("/admin/delete");

        return { message: "Medlemmet er slettet permanent." };
    } catch (error) {
        console.error("Failed to delete member:", error);
        return { error: "En uventet feil oppstod under sletting." };
    }
}
