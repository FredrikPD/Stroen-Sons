import { Metadata } from "next";
import { prisma } from "@/server/db";
import { ensureMember } from "@/server/auth/ensureMember";
import { redirect } from "next/navigation";
import EventsView from "@/components/events/EventsView";
import { unstable_cache } from "next/cache";

export const metadata: Metadata = {
    title: "Arrangementer",
    description: "Kommende og tidligere arrangementer.",
};

type EventsListRow = {
    id: string;
    title: string;
    description: string | null;
    coverImage: string | null;
    location: string | null;
    isTba: boolean;
    category: string | null;
    startAt: Date | string;
    _count: { attendees: number };
    attendees: Array<{
        firstName: string | null;
        lastName: string | null;
        avatarUrl: string | null;
        role: string;
        email: string | null;
    }>;
    recap: { status: string } | null;
};

export default async function EventsPage() {
    const member = await ensureMember();
    if (!member) {
        redirect("/sign-in");
    }

    const getEvents = unstable_cache(
        async () => {
            return prisma.event.findMany({
                orderBy: {
                    startAt: "asc",
                },
                include: {
                    _count: {
                        select: { attendees: true },
                    },
                    recap: {
                        select: { status: true },
                    },
                    attendees: {
                        take: 3,
                        select: {
                            firstName: true,
                            lastName: true,
                            avatarUrl: true,
                            role: true,
                            email: true,
                        }
                    }
                },
                cacheStrategy: { ttl: 60, swr: 60 }
            });
        },
        ["events-list-page"],
        { revalidate: 60, tags: ["events"] }
    );

    const events = (await getEvents()) as unknown as EventsListRow[];

    const categories = await prisma.eventCategory.findMany({
        select: { name: true, color: true }
    });

    const categoryColorMap = categories.reduce((acc, cat) => {
        acc[cat.name] = cat.color;
        return acc;
    }, {} as Record<string, string>);

    const serializedEvents = events.map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        coverImage: event.coverImage,
        location: event.location,
        isTba: event.isTba,
        _count: event._count,
        category: event.category,
        attendees: event.attendees,
        hasPublishedRecap: event.recap?.status === "PUBLISHED",
        startAt: new Date(event.startAt).toISOString(),
    }));

    return (
        <div className="w-full bg-white min-h-full">
            <EventsView initialEvents={serializedEvents} categoryColorMap={categoryColorMap} />
        </div>
    );
}
