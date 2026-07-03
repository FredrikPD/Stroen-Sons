import Link from "next/link";
import { db } from "@/server/db";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { DeleteEventButton } from "./_components/DeleteEventButton";
import { SetHeader } from "@/components/layout/SetHeader";
import { ActionInfo } from "@/components/ui/ActionInfo";
import { AdminPageHeader, AdminEmptyState, btnPrimary, card, seeAllLink, SERIF } from "@/components/admin/ui";

import { ensureRole } from "@/server/auth/ensureRole";
import { Prisma, Role } from "@prisma/client";

export const metadata = {
    title: "Administrer Arrangementer",
};

export default async function EventsListPage() {
    await ensureRole([Role.ADMIN, Role.MODERATOR]);
    type EventWithAttendees = Prisma.EventGetPayload<{
        include: { attendees: true };
    }>;

    const events = await db.event.findMany({
        orderBy: {
            startAt: "desc",
        },
        include: {
            attendees: true,
        },
    }) as EventWithAttendees[];

    return (
        <div className="space-y-8 pb-12">
            <SetHeader backHref="/admin/dashboard" backLabel="Dashboard" />

            <AdminPageHeader
                eyebrow="Arrangementer"
                title="Alle Arrangementer"
                description="Administrer klubbens arrangementer"
                actions={
                    <Link href="/admin/events/new" className={btnPrimary}>
                        <span className="material-symbols-outlined text-lg">add_circle</span>
                        Nytt Arrangement
                    </Link>
                }
            />

            {/* Content */}
            {events.length === 0 ? (
                <AdminEmptyState icon="event_busy">
                    Det er ingen arrangementer i systemet enda.
                    <Link href="/admin/events/new" className={`${seeAllLink} not-italic ml-2`}>
                        Opprett det første
                    </Link>
                </AdminEmptyState>
            ) : (
                <div className={`${card} overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <div className="px-6 pt-4">
                            <ActionInfo variant="danger" compact>
                                Sletting av et arrangement er permanent. Program, etterrapport, bilder og alle påmeldinger fjernes. Fakturaer og transaksjoner beholdes uten kobling – ingen beløp endres og ingen varsler sendes.
                            </ActionInfo>
                        </div>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#faf8f3] border-b border-border-color">
                                <tr>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-400">Arrangement</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-400">Dato</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-400">Sted</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-400">Påmeldte</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-400 text-right">Handlinger</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-color">
                                {events.map((event) => (
                                    <tr key={event.id} className="hover:bg-black/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900" style={{ fontFamily: SERIF }}>{event.title}</div>
                                            {event.description && (
                                                <div className="text-gray-500 text-xs truncate max-w-[200px]">{event.description}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-medium tabular-nums">
                                            {format(new Date(event.startAt), "d. MMM yyyy HH:mm", { locale: nb })}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {event.location || "—"}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <div className="flex items-center gap-1.5 tabular-nums">
                                                <span className="material-symbols-outlined text-gray-400 text-base">group</span>
                                                {event.attendees.length}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {new Date(event.startAt) < new Date() && (
                                                    <Link
                                                        href={`/admin/events/${event.id}/recap`}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
                                                        title="Etterrapport"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">article</span>
                                                    </Link>
                                                )}
                                                <Link
                                                    href={`/admin/events/${event.id}/edit`}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
                                                    title="Rediger"
                                                >
                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                </Link>
                                                <DeleteEventButton id={event.id} title={event.title} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
