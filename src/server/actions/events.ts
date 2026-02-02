"use server";

import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { eventSchema, EventInput } from "@/lib/validators/events";

export type CreateEventInput = EventInput;

export async function createEvent(input: CreateEventInput) {
    const { userId } = await auth();

    if (!userId) {
        return { success: false, error: "Ikke autentisert" };
    }

    try {
        const member = await db.member.findUnique({
            where: { clerkId: userId },
        });

        if (!member || member.role !== "ADMIN") {
            return { success: false, error: "Du har ikke tilgang til å opprette arrangementer" };
        }

        const validData = eventSchema.safeParse(input);

        if (!validData.success) {
            return { success: false, error: "Ugyldig data", details: validData.error.flatten() };
        }

        const { title, description, startAt, location, address, coverImage, totalCost, clubSubsidy, program } = validData.data;

        await db.event.create({
            data: {
                title,
                description: description || null,
                startAt,
                location: location || null,
                address: address || null,
                coverImage: coverImage || null,
                totalCost: totalCost || null,
                clubSubsidy: clubSubsidy || null,
                createdById: member.id,
                program: program ? {
                    createMany: {
                        data: program.map((item, index) => ({
                            ...item,
                            order: index,
                        })),
                    },
                } : undefined,
            },
        });

        revalidatePath("/admin");
        revalidatePath("/events");
        revalidatePath("/dashboard");

        return { success: true };

    } catch (error) {
        console.error("Failed to create event:", error);
        return { success: false, error: "En feil oppstod under opprettelse av arrangementet" };
    }
}

export async function updateEvent(id: string, input: EventInput) {
    const { userId } = await auth();

    if (!userId) {
        return { success: false, error: "Ikke autentisert" };
    }

    try {
        const member = await db.member.findUnique({
            where: { clerkId: userId },
        });

        if (!member || member.role !== "ADMIN") {
            return { success: false, error: "Du har ikke tilgang til å oppdatere arrangementer" };
        }

        const validData = eventSchema.safeParse(input);

        if (!validData.success) {
            return { success: false, error: "Ugyldig data", details: validData.error.flatten() };
        }

        const { title, description, startAt, location, address, coverImage, totalCost, clubSubsidy, program } = validData.data;

        await db.event.update({
            where: { id },
            data: {
                title,
                description: description || null,
                startAt,
                location: location || null,
                address: address || null,
                coverImage: coverImage || null,
                totalCost: totalCost || null,
                clubSubsidy: clubSubsidy || null,
                program: {
                    deleteMany: {},
                    createMany: program ? {
                        data: program.map((item, index) => ({
                            ...item,
                            order: index,
                        })),
                    } : undefined,
                },
            },
        });

        revalidatePath("/admin");
        revalidatePath("/events");
        revalidatePath(`/admin/events/${id}/edit`);
        revalidatePath("/dashboard");

        return { success: true };

    } catch (error) {
        console.error("Failed to update event:", error);
        return { success: false, error: "En feil oppstod under oppdatering av arrangementet" };
    }
}

export async function deleteEvent(id: string) {
    const { userId } = await auth();

    if (!userId) {
        return { success: false, error: "Ikke autentisert" };
    }

    try {
        const member = await db.member.findUnique({
            where: { clerkId: userId },
        });

        if (!member || member.role !== "ADMIN") {
            return { success: false, error: "Du har ikke tilgang til å slette arrangementer" };
        }

        await db.event.delete({
            where: { id },
        });

        revalidatePath("/admin");
        revalidatePath("/events");
        revalidatePath("/dashboard");

        return { success: true };
    } catch (error) {
        console.error("Failed to delete event:", error);
        return { success: false, error: "En feil oppstod under sletting av arrangementet" };
    }
}
