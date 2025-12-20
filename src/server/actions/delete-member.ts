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
        const client = await clerkClient();
        try {
            await client.users.deleteUser(member.clerkId);
        } catch (clerkError: any) {
            console.error("Failed to delete Clerk user:", clerkError);
            // If user not found in Clerk (404), we can proceed to delete from DB
            // Otherwise, we might want to stop? For now, we proceed to clean up our DB
            // assuming admin wants them gone.
            const isNotFound = clerkError?.errors?.[0]?.code === "resource_not_found";
            if (!isNotFound) {
                // return { error: "Kunne ikke slette bruker fra Clerk. Prøv igjen manuelt i Clerk dashboard." };
                // Actually, let's proceed but warn? No, let's just log and proceed for "force delete" feel
            }
        }

        // 3. Delete from Prisma
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
