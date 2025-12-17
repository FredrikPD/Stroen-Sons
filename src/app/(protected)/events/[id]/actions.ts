"use server";

import { ensureMember } from "@/server/auth/ensureMember";
import { prisma } from "@/server/db";
import { revalidatePath } from "next/cache";

export async function joinEvent(eventId: string) {
    try {
        const member = await ensureMember();
        if (!member) throw new Error("Unauthorized");

        await prisma.event.update({
            where: { id: eventId },
            data: {
                attendees: {
                    connect: { id: member.id }
                }
            }
        });

        revalidatePath(`/events/${eventId}`);
        return { success: true };
    } catch (error) {
        console.error("Failed to join event:", error);
        return { success: false, error: "Failed to join event" };
    }
}

export async function leaveEvent(eventId: string) {
    try {
        const member = await ensureMember();
        if (!member) throw new Error("Unauthorized");

        await prisma.event.update({
            where: { id: eventId },
            data: {
                attendees: {
                    disconnect: { id: member.id }
                }
            }
        });

        revalidatePath(`/events/${eventId}`);
        return { success: true };
    } catch (error) {
        console.error("Failed to leave event:", error);
        return { success: false, error: "Failed to leave event" };
    }
}
