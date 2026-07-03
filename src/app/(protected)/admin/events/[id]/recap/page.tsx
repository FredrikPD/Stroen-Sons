import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Prisma, Role } from "@prisma/client";
import { db } from "@/server/db";
import { ensureRole } from "@/server/auth/ensureRole";
import { SetHeader } from "@/components/layout/SetHeader";
import { EventRecapForm } from "@/components/events/EventRecapForm";
import { PodiumCard } from "@/components/events/PodiumCard";
import { ActionInfo } from "@/components/ui/ActionInfo";
import { btnPrimary, SERIF } from "@/components/admin/ui";
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
            <div className="mb-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">
                            Arrangementer
                        </p>
                        <h1 className="text-3xl sm:text-4xl font-normal text-gray-900 leading-none" style={{ fontFamily: SERIF }}>
                            Etterrapport
                        </h1>
                        <p className="mt-3 text-sm text-text-secondary max-w-2xl leading-relaxed">
                            Skriv eller oppdater etterrapport for {event.title}.
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                        <button type="submit" form={recapFormId} className={btnPrimary}>
                            <span className="material-symbols-outlined text-base">save</span>
                            Lagre endringer
                        </button>
                        <ActionInfo variant="info" compact className="max-w-xs text-right">
                            Lagrer hele etterrapporten. Er status &quot;Publisert&quot; blir rapporten synlig for alle medlemmer &ndash; &quot;Utkast&quot; vises kun for admin/moderator. Kamplisten erstattes helt av det som står i skjemaet nå, så kamper du har fjernet blir borte. Ingen varsler sendes ut.
                        </ActionInfo>
                    </div>
                </div>
                <div className="h-px bg-gray-300 mt-5" />
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
