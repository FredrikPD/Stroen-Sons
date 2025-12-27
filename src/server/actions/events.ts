"use server";

import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const createEventSchema = z.object({
    title: z.string().min(1, "Tittel er påkrevd"),
    description: z.string().optional(),
    startAt: z.coerce.date(),
    location: z.string().optional(),
    address: z.string().optional(),
    coverImage: z.string().optional(),
    totalCost: z.coerce.number().min(0).optional(),
    clubSubsidy: z.coerce.number().min(0).optional(),
    program: z.array(z.object({
        time: z.string().min(1, "Tidspunkt er påkrevd"),
        title: z.string().min(1, "Tittel er påkrevd"),
        description: z.string().optional(),
    })).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

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

        const validData = createEventSchema.safeParse(input);

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

        return { success: true };

    } catch (error) {
        console.error("Failed to create event:", error);
        return { success: false, error: "En feil oppstod under opprettelse av arrangementet" };
    }
}
