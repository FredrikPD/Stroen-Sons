"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { ensureMember } from "@/server/auth/ensureMember";
import { eventPodiumSchema, EventPodiumInput } from "@/lib/validators/event-podium";

export async function upsertEventPodium(recapId: string, input: EventPodiumInput) {
    try {
        const member = await ensureMember();
        if (!member || (member.role !== "ADMIN" && member.role !== "MODERATOR")) {
            return { success: false, error: "Du har ikke tilgang" };
        }

        const parsed = eventPodiumSchema.safeParse(input);
        if (!parsed.success) {
            return {
                success: false,
                error: parsed.error.issues[0]?.message || "Ugyldig data",
            };
        }

        const data = parsed.data;

        // Verify recap exists and get event id for revalidation
        const recap = await db.eventRecap.findUnique({
            where: { id: recapId },
            select: { id: true, eventId: true },
        });

        if (!recap) {
            return { success: false, error: "Etterrapporten finnes ikke" };
        }

        // Delete existing podium if any
        await db.eventPodium.deleteMany({ where: { recapId } });

        // Create new podium with entries
        await db.eventPodium.create({
            data: {
                recapId,
                type: data.type,
                entries: {
                    create: data.entries.map((entry) => ({
                        place: entry.place,
                        teamName: data.type === "TEAM" ? entry.teamName?.trim() || null : null,
                        memberId: data.type === "INDIVIDUAL" ? entry.memberId || null : null,
                        teamMembers: data.type === "TEAM" && entry.teamMemberIds.length > 0
                            ? {
                                create: entry.teamMemberIds.map((memberId) => ({
                                    memberId,
                                })),
                            }
                            : undefined,
                    })),
                },
            },
        });

        revalidatePath(`/admin/events/${recap.eventId}/recap`);
        revalidatePath(`/events/${recap.eventId}`);
        revalidatePath("/scoreboard");

        return { success: true };
    } catch (error) {
        console.error("Failed to upsert event podium:", error);
        return { success: false, error: "Kunne ikke lagre podium" };
    }
}

export async function deleteEventPodium(recapId: string) {
    try {
        const member = await ensureMember();
        if (!member || (member.role !== "ADMIN" && member.role !== "MODERATOR")) {
            return { success: false, error: "Du har ikke tilgang" };
        }

        const recap = await db.eventRecap.findUnique({
            where: { id: recapId },
            select: { eventId: true },
        });

        await db.eventPodium.deleteMany({ where: { recapId } });

        if (recap) {
            revalidatePath(`/admin/events/${recap.eventId}/recap`);
            revalidatePath(`/events/${recap.eventId}`);
            revalidatePath("/scoreboard");
        }

        return { success: true };
    } catch (error) {
        console.error("Failed to delete event podium:", error);
        return { success: false, error: "Kunne ikke slette podium" };
    }
}
