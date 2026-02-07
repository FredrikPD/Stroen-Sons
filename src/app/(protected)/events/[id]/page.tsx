import { prisma } from "@/server/db";
import { ensureMember } from "@/server/auth/ensureMember";
import { redirect, notFound } from "next/navigation";
import EventDetailView from "@/components/events/EventDetailView";
import { Metadata } from "next";
import PageTitleUpdater from "@/components/layout/PageTitleUpdater";

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
                select: { attendees: true, photos: true }
            },
            photos: {
                take: 6,
                orderBy: { createdAt: 'desc' }
            }
        }
    }) as any;

    if (!event) {
        notFound();
    }

    const isAttending = event.attendees.some((a: any) => a.id === member.id);
    const hasPassed = new Date(event.startAt) < new Date();

    const serializedEvent = {
        id: event.id,
        title: event.title,
        description: event.description,
        startAt: event.startAt.toISOString(),
        endAt: event.endAt ? event.endAt.toISOString() : null,
        registrationDeadline: event.registrationDeadline ? event.registrationDeadline.toISOString() : null,
        maxAttendees: event.maxAttendees,
        location: event.location,
        address: event.address,
        totalCost: event.totalCost,
        clubSubsidy: event.clubSubsidy,
        isTba: event.isTba,
        coverImage: event.coverImage,
        program: event.program.map((p: any) => ({
            ...p,
            date: p.date ? p.date.toISOString() : null,
        })),
        hasPassed,
        photos: event.photos,
    };

    return (
        <>
            <PageTitleUpdater title={event.title} />
            <EventDetailView
                event={serializedEvent}
                attendees={event.attendees}
                currentUserIsAttending={isAttending}
                attendeeCount={event._count.attendees}
                photos={event.photos}
                totalPhotoCount={event._count.photos}
            />
        </>
    );
}
