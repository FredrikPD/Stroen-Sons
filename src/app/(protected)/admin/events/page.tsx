import Link from "next/link";
import { db } from "@/server/db";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { deleteEvent } from "@/server/actions/events";
import { DeleteEventButton } from "./_components/DeleteEventButton";

import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";

export default async function EventsListPage() {
    await ensureRole([Role.ADMIN, Role.MODERATOR]);
    const events = await db.event.findMany({
        orderBy: {
            startAt: "desc",
        },
        include: {
            attendees: true,
        },
    });

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-6">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Alle Arrangementer</h1>
                        <p className="text-gray-500 text-sm">Administrer klubbens arrangementer</p>
                    </div>
                </div>
                <Link
                    href="/admin/events/new"
                    className="bg-[#4F46E5] hover:bg-[#4338ca] text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 flex items-center gap-2 text-sm"
                >
                    <span className="material-symbols-outlined text-lg">add_circle</span>
                    Nytt Arrangement
                </Link>
            </div>

            {/* Content */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {events.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <span className="material-symbols-outlined text-3xl">event_busy</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Ingen arrangementer</h3>
                        <p className="text-gray-500 text-sm mb-6">Det er ingen arrangementer i systemet enda.</p>
                        <Link
                            href="/admin/events/new"
                            className="inline-flex items-center gap-2 text-[#4F46E5] font-bold text-sm hover:underline"
                        >
                            Opprett det første arrangementet
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Arrangement</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Dato</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Sted</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Påmeldte</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700 text-right">Handlinger</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {events.map((event: any) => (
                                    <tr key={event.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{event.title}</div>
                                            {event.description && (
                                                <div className="text-gray-500 text-xs truncate max-w-[200px]">{event.description}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-medium">
                                            {format(new Date(event.startAt), "d. MMM yyyy HH:mm", { locale: nb })}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {event.location || "—"}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <div className="flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-gray-400 text-base">group</span>
                                                {event.attendees.length}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/admin/events/${event.id}/edit`}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors"
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
                )}
            </div>
        </div>
    );
}
