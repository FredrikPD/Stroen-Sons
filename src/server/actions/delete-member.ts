"use server";

import { db } from "@/server/db";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { ensureMember } from "@/server/auth/ensureMember";

export type DeleteMemberState = {
    message?: string;
    error?: string;
};

export async function deleteMember(
    prevState: DeleteMemberState,
    formData: FormData
): Promise<DeleteMemberState> {
    const admin = await ensureMember();
    if (admin.role !== "ADMIN") return { error: "Du har ikke tilgang til å slette medlemmer." };

    const memberId = formData.get("memberId") as string;

    if (!memberId) {
        return { error: "Ingen medlems-ID oppgitt." };
    }

    try {
        // 1. Fetch member
        const member = await db.member.findUnique({
            where: { id: memberId },
        });

        if (!member) {
            return { error: "Fant ikke medlemmet i databasen." };
        }

        if (member.deletedAt) {
            return { error: "Medlemmet er allerede slettet." };
        }

        // 2. Delete from Clerk (revoke login access)
        if (member.clerkId) {
            const client = await clerkClient();
            try {
                await client.users.deleteUser(member.clerkId);
            } catch (clerkError: any) {
                const isNotFound =
                    clerkError?.status === 404 ||
                    clerkError?.errors?.[0]?.code === "resource_not_found";

                if (isNotFound) {
                    console.log("Member not found in Clerk (already deleted?), continuing with soft-delete.");
                } else {
                    console.error("Failed to delete Clerk user:", clerkError);
                }
            }
        }

        // 3. Clean up financial records that are no longer relevant
        await db.paymentRequest.deleteMany({ where: { memberId } });
        await db.payment.deleteMany({ where: { memberId } });

        // 4. Handle balance payout if positive
        const balance = Number(member.balance);
        if (balance > 0) {
            await db.transaction.create({
                data: {
                    amount: -balance,
                    description: `Utbetaling av saldo ved utmelding: ${member.firstName} ${member.lastName}`,
                    category: "MEMBER_EXIT",
                    date: new Date(),
                    memberId,
                },
            });
        }

        // 5. Soft-delete: anonymize sensitive data, mark as deleted
        // Keep firstName/lastName for historical attribution (scoreboard, transactions, events)
        await db.member.update({
            where: { id: memberId },
            data: {
                deletedAt: new Date(),
                status: "INACTIVE",
                clerkId: null,
                email: `deleted-${memberId}@removed.local`,
                phoneNumber: null,
                address: null,
                zipCode: null,
                city: null,
                avatarUrl: null,
                balance: 0,
                pauseMonthlyFees: true,
            },
        });

        revalidatePath("/admin/users");
        revalidatePath("/admin/system/delete");
        revalidatePath("/members");

        return { message: "Medlemmet er deaktivert og personlig data er anonymisert." };
    } catch (error) {
        console.error("Failed to soft-delete member:", error);
        return { error: "En uventet feil oppstod under sletting." };
    }
}
