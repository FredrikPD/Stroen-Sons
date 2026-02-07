import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/server/db";
import { updateEvent } from "@/server/actions/events";
import { EventForm } from "@/components/events/EventForm";
import { EventInput } from "@/lib/validators/events";

interface EditEventPageProps {
    params: Promise<{
        id: string;
    }>;
}

import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";

export default async function EditEventPage({ params }: EditEventPageProps) {
    await ensureRole([Role.ADMIN, Role.MODERATOR]);
    const { id } = await params;
    const event = await db.event.findUnique({
        where: { id },
        include: {
            program: {
                orderBy: {
                    order: "asc",
                },
            },
        },
    });

    // @ts-ignore - Prisma include types are correct at runtime
    const eventWithRelations = event as any;

    if (!event) {
        notFound();
    }

    const handleSubmit = async (data: EventInput) => {
        "use server";
        return await updateEvent(id, data);
    };

    // Prepare initial data
    const initialData: Partial<EventInput> = {
        title: event.title,
        description: event.description || "",
        startAt: event.startAt,
        registrationDeadline: event.registrationDeadline || undefined,
        endAt: event.endAt || undefined,
        maxAttendees: event.maxAttendees || undefined,
        location: event.location || "",
        address: event.address || "",
        coverImage: event.coverImage || undefined,
        totalCost: event.totalCost || 0,
        clubSubsidy: event.clubSubsidy || 0,
        isTba: event.isTba || false,
        program: (event as any).program.map((p: any) => ({
            time: p.time,
            date: p.date,
            title: p.title,
            description: p.description || "",
        })),
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Rediger Arrangement</h1>
                    <p className="text-gray-500 text-sm">Endre informasjonen for dette arrangementet.</p>
                </div>
            </div>

            <EventForm
                initialData={initialData}
                onSubmit={handleSubmit}
                submitButtonText="Lagre Endringer"
                isEditMode
                redirectOnSuccess="/admin/events"
            />
        </div>
    );
}
