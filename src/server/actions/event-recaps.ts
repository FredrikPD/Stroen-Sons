"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { ensureMember } from "@/server/auth/ensureMember";
import { eventRecapSchema, EventRecapInput } from "@/lib/validators/event-recaps";

const normalizeTextArray = (values: string[]) => {
    return values
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
};

export async function upsertEventRecap(eventId: string, input: EventRecapInput) {
    try {
        const member = await ensureMember();
        if (!member || (member.role !== "ADMIN" && member.role !== "MODERATOR")) {
            return { success: false, error: "Du har ikke tilgang til å redigere etterrapporter" };
        }

        const parsed = eventRecapSchema.safeParse(input);
        if (!parsed.success) {
            return {
                success: false,
                error: parsed.error.issues[0]?.message || "Ugyldig etterrapport-data",
            };
        }

        const event = await db.event.findUnique({
            where: { id: eventId },
            select: { id: true },
        });

        if (!event) {
            return { success: false, error: "Arrangementet finnes ikke" };
        }

        const data = parsed.data;
        const summaryPoints = normalizeTextArray(data.summaryPoints);
        const highlights = normalizeTextArray(data.highlights);
        const now = new Date();

        const existing = await db.eventRecap.findUnique({
            where: { eventId },
            select: { id: true, publishedAt: true },
        });

        await db.eventRecap.upsert({
            where: { eventId },
            create: {
                eventId,
                authorId: member.id,
                status: data.status,
                summaryPoints,
                story: data.story || null,
                actionsTaken: data.actionsTaken || null,
                highlights,
                lessons: data.lessons || null,
                nextTime: data.nextTime || null,
                publishedAt: data.status === "PUBLISHED" ? now : null,
                games: data.games.length > 0 ? {
                    createMany: {
                        data: data.games.map((game, index) => ({
                            title: game.title.trim(),
                            opponent: game.opponent?.trim() || null,
                            ourScore: game.ourScore,
                            theirScore: game.theirScore,
                            result: game.result,
                            notes: game.notes?.trim() || null,
                            order: index,
                        })),
                    },
                } : undefined,
            },
            update: {
                authorId: member.id,
                status: data.status,
                summaryPoints,
                story: data.story || null,
                actionsTaken: data.actionsTaken || null,
                highlights,
                lessons: data.lessons || null,
                nextTime: data.nextTime || null,
                publishedAt: data.status === "PUBLISHED"
                    ? existing?.publishedAt || now
                    : null,
                games: {
                    deleteMany: {},
                    createMany: data.games.length > 0 ? {
                        data: data.games.map((game, index) => ({
                            title: game.title.trim(),
                            opponent: game.opponent?.trim() || null,
                            ourScore: game.ourScore,
                            theirScore: game.theirScore,
                            result: game.result,
                            notes: game.notes?.trim() || null,
                            order: index,
                        })),
                    } : undefined,
                },
            },
        });

        revalidatePath("/events");
        revalidatePath(`/events/${eventId}`);
        revalidatePath("/admin/events");
        revalidatePath(`/admin/events/${eventId}/recap`);

        return { success: true };
    } catch (error) {
        console.error("Failed to upsert event recap:", error);
        return { success: false, error: "Kunne ikke lagre etterrapport" };
    }
}
