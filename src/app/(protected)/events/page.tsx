import { Metadata } from "next";
import { prisma } from "@/server/db";
import { ensureMember } from "@/server/auth/ensureMember";
import { redirect } from "next/navigation";
import EventsView from "@/components/events/EventsView";
import { type EventListItem } from "@/components/events/EventCard";
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
    maxAttendees: number | null;
    totalCost: number | null;
    clubSubsidy: number | null;
    _count: { attendees: number; photos: number };
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
                orderBy: { startAt: "asc" },
                include: {
                    _count: { select: { attendees: true, photos: true } },
                    recap: { select: { status: true } },
                },
                cacheStrategy: { ttl: 60, swr: 60 },
            });
        },
        ["events-list-page"],
        { revalidate: 60, tags: ["events"] }
    );

    const now = new Date();

    const [events, categories, attendingRows] = await Promise.all([
        getEvents() as unknown as Promise<EventsListRow[]>,
        prisma.eventCategory.findMany({ select: { name: true, color: true } }),
        // Per-member attendance for upcoming events (uncached — varies per user).
        prisma.event.findMany({
            where: { startAt: { gte: now }, attendees: { some: { id: member.id } } },
            select: { id: true },
        }),
    ]);

    const categoryColorMap = categories.reduce((acc, cat) => {
        acc[cat.name] = cat.color;
        return acc;
    }, {} as Record<string, string>);

    const serialize = (e: EventsListRow): EventListItem => ({
        id: e.id,
        title: e.title,
        description: e.description,
        coverImage: e.coverImage,
        location: e.location,
        isTba: e.isTba,
        category: e.category,
        startAt: new Date(e.startAt).toISOString(),
        attendeeCount: e._count.attendees,
        photoCount: e._count.photos,
        maxAttendees: e.maxAttendees,
        memberCost: e.totalCost != null ? e.totalCost - (e.clubSubsidy ?? 0) : null,
        hasPublishedRecap: e.recap?.status === "PUBLISHED",
    });

    // Split: soonest-upcoming = hero, the rest = "Kommende" rows, past = "Tidligere".
    const upcomingAll = events
        .filter((e) => new Date(e.startAt) >= now)
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
        .map(serialize);

    const past = events
        .filter((e) => new Date(e.startAt) < now)
        .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
        .map(serialize);

    const featured = upcomingAll[0] ?? null;
    const upcoming = upcomingAll.slice(1);

    const isEditor = member.role === "ADMIN" || member.role === "MODERATOR";

    return (
        <EventsView
            featured={featured}
            upcoming={upcoming}
            past={past}
            attendingEventIds={attendingRows.map((r) => r.id)}
            categoryColorMap={categoryColorMap}
            isEditor={isEditor}
        />
    );
}
