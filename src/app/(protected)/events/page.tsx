import { Metadata } from "next";
import { prisma } from "@/server/db";
import { ensureMember } from "@/server/auth/ensureMember";
import { redirect } from "next/navigation";
import EventsView from "@/components/events/EventsView";
import { unstable_cache } from "next/cache";

export const metadata: Metadata = {
    title: "Arrangementer | Strøen Søns",
    description: "Kommende og tidligere arrangementer.",
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
                    attendees: {
                        take: 3,
                        select: {
                            firstName: true,
                            lastName: true,
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

    const events = await getEvents() as any;

    // Transform to match generic expected type if needed, but Prisma type matches approximate shape.
    // We need to ensure dates are serialized properly if passing to client component from server component?
    // Next.js handles Date objects in props since recent versions (or warns). 
    // Best practice: Serialize to ISO string to be safe.

    const serializedEvents = events.map((event: any) => ({
        ...event,
        startAt: new Date(event.startAt).toISOString(),
        createdAt: new Date(event.createdAt).toISOString(),
        updatedAt: new Date(event.updatedAt).toISOString(),
    }));

    return (
        <div className="w-full bg-white min-h-full">
            <EventsView initialEvents={serializedEvents as any} />
        </div>
    );
}
