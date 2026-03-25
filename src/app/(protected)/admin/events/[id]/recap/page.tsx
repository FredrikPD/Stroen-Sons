import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Prisma, Role } from "@prisma/client";
import { db } from "@/server/db";
import { ensureRole } from "@/server/auth/ensureRole";
import { SetHeader } from "@/components/layout/SetHeader";
import { EventRecapForm } from "@/components/events/EventRecapForm";
import { PodiumCard } from "@/components/events/PodiumCard";
import { upsertEventRecap } from "@/server/actions/event-recaps";
import { EventRecapInput } from "@/lib/validators/event-recaps";

interface EditEventRecapPageProps {
    params: Promise<{ id: string }>;
}

type EventWithRecap = Prisma.EventGetPayload<{
    include: {
        recap: {
            include: {
                games: true;
                podium: {
                    include: {
                        entries: {
                            include: {
                                teamMembers: true;
                            };
                        };
                    };
                };
            };
        };
    };
}>;

export async function generateMetadata({ params }: EditEventRecapPageProps): Promise<Metadata> {
    const { id } = await params;
    const event = await db.event.findUnique({
        where: { id },
        select: { title: true },
    });

    return {
        title: event ? `Etterrapport: ${event.title}` : "Etterrapport",
    };
}

export default async function EditEventRecapPage({ params }: EditEventRecapPageProps) {
    await ensureRole([Role.ADMIN, Role.MODERATOR]);
    const { id } = await params;

    const event = await db.event.findUnique({
        where: { id },
        include: {
            recap: {
                include: {
                    games: {
                        orderBy: { order: "asc" },
                    },
                    podium: {
                        include: {
                            entries: {
                                orderBy: { place: "asc" },
                                include: {
                                    teamMembers: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    }) as EventWithRecap | null;

    // Fetch all members for the podium selector
    const allMembers = await db.member.findMany({
        where: { deletedAt: null },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    if (!event) {
        notFound();
    }

    if (new Date(event.startAt) >= new Date()) {
        notFound();
    }

    const handleSubmit = async (data: EventRecapInput) => {
        "use server";
        return await upsertEventRecap(id, data);
    };

    const normalizeStatus = (status: string): EventRecapInput["status"] => {
        if (status === "PUBLISHED") {
            return "PUBLISHED";
        }
        return "DRAFT";
    };

    const normalizeResult = (result: string | null): EventRecapInput["games"][number]["result"] => {
        if (result === "WIN" || result === "DRAW" || result === "LOSS") {
            return result;
        }
        return undefined;
    };

    const initialData = event.recap
        ? {
            status: normalizeStatus(event.recap.status),
            summaryPoints: event.recap.summaryPoints,
            story: event.recap.story || undefined,
            actionsTaken: event.recap.actionsTaken || undefined,
            highlights: event.recap.highlights,
            lessons: event.recap.lessons || undefined,
            nextTime: event.recap.nextTime || undefined,
            games: event.recap.games.map((game) => ({
                title: game.title,
                opponent: game.opponent || "",
                ourScore: game.ourScore ?? undefined,
                theirScore: game.theirScore ?? undefined,
                result: normalizeResult(game.result),
                notes: game.notes || undefined,
            })),
        }
        : undefined;
    const recapFormId = `event-recap-form-${event.id}`;

    return (
        <div className="space-y-8 pb-12">
            <SetHeader backHref={`/events/${event.id}`} backLabel={event.title} />
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Etterrapport</h1>
                    <p className="text-gray-500 text-sm">
                        Skriv eller oppdater etterrapport for {event.title}.
                    </p>
                </div>
                <button
                    type="submit"
                    form={recapFormId}
                    className="inline-flex shrink-0 items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4F46E5] text-white text-sm font-bold hover:bg-[#4338ca]"
                >
                    <span className="material-symbols-outlined text-base">save</span>
                    Lagre endringer
                </button>
            </div>

            <EventRecapForm
                eventId={event.id}
                initialData={initialData}
                onSubmit={handleSubmit}
                redirectOnSuccess={`/events/${event.id}`}
                formId={recapFormId}
            />

            <PodiumCard
                recapId={event.recap?.id ?? null}
                members={allMembers}
                existingPodium={event.recap?.podium ? {
                    type: event.recap.podium.type as "INDIVIDUAL" | "TEAM",
                    entries: event.recap.podium.entries.map((e) => ({
                        place: e.place,
                        teamName: e.teamName,
                        memberId: e.memberId,
                        teamMembers: e.teamMembers,
                    })),
                } : null}
            />
        </div>
    );
}
