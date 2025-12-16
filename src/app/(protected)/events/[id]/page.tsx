import { prisma } from "@/lib/prisma";
import { ensureMember } from "@/server/auth/ensureMember";
import { redirect, notFound } from "next/navigation";
import EventDetailView from "@/components/events/EventDetailView";
import { Metadata } from "next";

type Props = {
    params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const event = await prisma.event.findUnique({
        where: { id },
        select: { title: true }
    });

    return {
        title: event ? `${event.title} | Strøen Søns` : "Event | Strøen Søns",
    };
}

export default async function EventDetailPage({ params }: Props) {
    const { id } = await params;
    const member = await ensureMember();
    if (!member) {
        redirect("/sign-in");
    }

    const event = await prisma.event.findUnique({
        where: { id },
        include: {
            program: {
                orderBy: { order: 'asc' }
            },
            attendees: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                }
            },
            _count: {
                select: { attendees: true }
            }
        }
    });

    if (!event) {
        notFound();
    }

    const isAttending = event.attendees.some(a => a.id === member.id);
    const hasPassed = new Date(event.startAt) < new Date();

    const serializedEvent = {
        id: event.id,
        title: event.title,
        description: event.description,
        startAt: event.startAt.toISOString(),
        location: event.location,
        address: event.address,
        coverImage: event.coverImage,
        program: event.program,
        hasPassed,
    };

    return (
        <EventDetailView
            event={serializedEvent}
            attendees={event.attendees}
            currentUserIsAttending={isAttending}
            attendeeCount={event._count.attendees}
        />
    );
}
