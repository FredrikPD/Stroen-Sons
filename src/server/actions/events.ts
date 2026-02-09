"use server";

import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { broadcastNotification } from "@/server/actions/notifications";

import { eventSchema, EventInput } from "@/lib/validators/events";
import { sendEventNotification, sendEventUpdateNotification } from "@/server/actions/emails";

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

        if (!member || (member.role !== "ADMIN" && member.role !== "MODERATOR")) {
            return { success: false, error: "Du har ikke tilgang til å opprette arrangementer" };
        }

        const validData = eventSchema.safeParse(input);

        if (!validData.success) {
            return { success: false, error: "Ugyldig data", details: validData.error.flatten() };
        }

        const {
            title,
            description,
            startAt,
            endAt,
            registrationDeadline,
            maxAttendees,
            location,
            address,
            coverImage,
            totalCost,
            clubSubsidy,
            program,
            isTba
        } = validData.data;

        const event = await db.event.create({
            data: {
                title,
                description: description || null,
                startAt,
                endAt: endAt || null,
                registrationDeadline: registrationDeadline || null,
                maxAttendees: maxAttendees || null,
                location: location || null,
                address: address || null,
                coverImage: coverImage || null,
                totalCost: totalCost || null,
                clubSubsidy: clubSubsidy || null,
                isTba: isTba || false,
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

        // Broadcast notification to all members
        await broadcastNotification({
            type: "EVENT_CREATED",
            title: "Nytt arrangement",
            message: `"${title}" har blitt lagt til i kalenderen.`,
            link: `/events/${event.id}`,
        });

        // Send notification if requested
        if (input.sendNotification) {
            // Import helper dynamically or at top? Top is better. I will add import via separate edit or assume auto-import if I can, layout tool can't auto import.
            // I'll add the import first.

            // Format date for email
            const dateStr = startAt.toLocaleDateString("no-NO", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit"
            });

            await sendEventNotification({
                eventTitle: title,
                eventDescription: description || "",
                eventDate: dateStr,
                eventLocation: location || undefined,
                eventId: event.id
            });
        }

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

        if (!member || (member.role !== "ADMIN" && member.role !== "MODERATOR")) {
            return { success: false, error: "Du har ikke tilgang til å oppdatere arrangementer" };
        }

        const validData = eventSchema.safeParse(input);

        if (!validData.success) {
            return { success: false, error: "Ugyldig data", details: validData.error.flatten() };
        }

        const {
            title,
            description,
            startAt,
            endAt,
            registrationDeadline,
            maxAttendees,
            location,
            address,
            coverImage,
            totalCost,
            clubSubsidy,
            program,
            isTba
        } = validData.data;

        await db.event.update({
            where: { id },
            data: {
                title,
                description: description || null,
                startAt,
                endAt: endAt || null,
                registrationDeadline: registrationDeadline || null,
                maxAttendees: maxAttendees || null,
                location: location || null,
                address: address || null,
                coverImage: coverImage || null,
                totalCost: totalCost || null,
                clubSubsidy: clubSubsidy || null,
                isTba: isTba || false,
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

        // Broadcast notification (unconditional)
        await broadcastNotification({
            type: "EVENT_UPDATED",
            title: "Arrangement oppdatert",
            message: `"${title}" har blitt oppdatert.`,
            link: `/events/${id}`,
        });

        if (validData.data.sendNotification) {
            const dateStr = startAt.toLocaleDateString("no-NO", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit"
            });

            await sendEventUpdateNotification({
                eventTitle: title,
                eventDescription: description || "",
                eventDate: dateStr,
                eventLocation: location || undefined,
                eventId: id
            });
        }

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

        if (!member || (member.role !== "ADMIN" && member.role !== "MODERATOR")) {
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

export async function getUpcomingEvents() {
    const { userId } = await auth();

    if (!userId) {
        return [];
    }

    try {
        const events = await db.event.findMany({
            where: {
                startAt: {
                    gte: new Date(),
                },
            },
            take: 3,
            orderBy: {
                startAt: "asc",
            },
            include: {
                _count: {
                    select: { attendees: true },
                },
            },
        });

        return events;
    } catch (error) {
        console.error("Failed to fetch upcoming events:", error);
        return [];
    }
}
