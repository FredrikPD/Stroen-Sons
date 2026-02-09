"use server";

import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function getEventParticipants(eventId: string) {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Ikke autentisert" };

    try {
        const participants = await db.member.findMany({
            where: {
                eventsAttending: {
                    some: {
                        id: eventId
                    }
                }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true
            },
            orderBy: { firstName: 'asc' }
        });

        return { success: true, participants };
    } catch (error) {
        console.error("Failed to get participants:", error);
        return { success: false, error: "Kunne ikke hente deltakere" };
    }
}

export async function adminAddParticipant(eventId: string, memberId: string) {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Ikke autentisert" };

    try {
        const admin = await db.member.findUnique({ where: { clerkId: userId } });
        if (!admin || (admin.role !== "ADMIN" && admin.role !== "MODERATOR")) {
            return { success: false, error: "Ingen tilgang" };
        }

        // Check availability
        const event = await db.event.findUnique({ where: { id: eventId } });
        if (!event) return { success: false, error: "Arrangement ikke funnet" };

        // Check if already attending
        const isAttending = await db.member.findFirst({
            where: {
                id: memberId,
                eventsAttending: {
                    some: { id: eventId }
                }
            }
        });

        if (isAttending) return { success: false, error: "Medlemmet er allerede påmeldt" };

        await db.event.update({
            where: { id: eventId },
            data: {
                attendees: {
                    connect: { id: memberId }
                }
            }
        });

        revalidatePath(`/events/${eventId}`);
        revalidatePath("/admin/system/event-participation");

        return { success: true };
    } catch (error) {
        console.error("Failed to add participant:", error);
        return { success: false, error: "Kunne ikke legge til deltaker" };
    }
}

export async function adminRemoveParticipant(eventId: string, memberId: string) {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Ikke autentisert" };

    try {
        const admin = await db.member.findUnique({ where: { clerkId: userId } });
        if (!admin || (admin.role !== "ADMIN" && admin.role !== "MODERATOR")) {
            return { success: false, error: "Ingen tilgang" };
        }

        await db.event.update({
            where: { id: eventId },
            data: {
                attendees: {
                    disconnect: { id: memberId }
                }
            }
        });

        revalidatePath(`/events/${eventId}`);
        revalidatePath("/admin/system/event-participation");

        return { success: true };
    } catch (error) {
        console.error("Failed to remove participant:", error);
        return { success: false, error: "Kunne ikke fjerne deltaker" };
    }
}
