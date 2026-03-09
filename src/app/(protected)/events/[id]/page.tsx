import { prisma } from "@/server/db";
import { ensureMember } from "@/server/auth/ensureMember";
import { redirect, notFound } from "next/navigation";
import EventDetailView from "@/components/events/EventDetailView";
import { Metadata } from "next";
import PageTitleUpdater from "@/components/layout/PageTitleUpdater";
import { Prisma } from "@prisma/client";

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

    type EventDetailQuery = Prisma.EventGetPayload<{
        include: {
            program: true;
            attendees: true;
            _count: true;
            photos: true;
            recap: {
                include: {
                    author: true;
                    games: true;
                    podium: {
                        include: {
                            entries: {
                                include: {
                                    member: true;
                                    teamMembers: {
                                        include: {
                                            member: true;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
    }>;

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
                    avatarUrl: true,
                    email: true,
                }
            },
            _count: {
                select: { attendees: true, photos: true }
            },
            photos: {
                take: 6,
                orderBy: { createdAt: 'desc' }
            },
            recap: {
                include: {
                    author: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                    games: {
                        orderBy: { order: "asc" },
                    },
                    podium: {
                        include: {
                            entries: {
                                orderBy: { place: "asc" },
                                include: {
                                    member: {
                                        select: {
                                            id: true,
                                            firstName: true,
                                            lastName: true,
                                            avatarUrl: true,
                                        },
                                    },
                                    teamMembers: {
                                        include: {
                                            member: {
                                                select: {
                                                    id: true,
                                                    firstName: true,
                                                    lastName: true,
                                                    avatarUrl: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        }
    }) as EventDetailQuery | null;

    if (!event) {
        notFound();
    }

    const isAttending = event.attendees.some((attendee) => attendee.id === member.id);
    const hasPassed = new Date(event.startAt) < new Date();
    const canEditRecap = member.role === "ADMIN" || member.role === "MODERATOR";

    const serializedRecap = event.recap ? {
        id: event.recap.id,
        status: event.recap.status,
        summaryPoints: event.recap.summaryPoints,
        story: event.recap.story,
        actionsTaken: event.recap.actionsTaken,
        highlights: event.recap.highlights,
        lessons: event.recap.lessons,
        nextTime: event.recap.nextTime,
        publishedAt: event.recap.publishedAt ? event.recap.publishedAt.toISOString() : null,
        updatedAt: event.recap.updatedAt.toISOString(),
        author: event.recap.author,
        games: event.recap.games,
        podium: event.recap.podium ? {
            type: event.recap.podium.type,
            entries: event.recap.podium.entries.map((e) => ({
                place: e.place,
                teamName: e.teamName,
                member: e.member ? {
                    id: e.member.id,
                    firstName: e.member.firstName,
                    lastName: e.member.lastName,
                    avatarUrl: e.member.avatarUrl,
                } : null,
                teamMembers: e.teamMembers.map((tm) => ({
                    id: tm.member.id,
                    firstName: tm.member.firstName,
                    lastName: tm.member.lastName,
                    avatarUrl: tm.member.avatarUrl,
                })),
            })),
        } : null,
    } : null;

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
        category: event.category,
        program: event.program.map((p) => ({
            ...p,
            date: p.date ? p.date.toISOString() : null,
        })),
        recap: serializedRecap,
        hasPassed,
        photos: event.photos,
    };

    let categoryColor = "blue";
    if (event.category) {
        const cat = await prisma.eventCategory.findFirst({
            where: { name: event.category }
        });
        if (cat) categoryColor = cat.color;
    }

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
                categoryColor={categoryColor}
                canEditRecap={canEditRecap}
            />
        </>
    );
}
