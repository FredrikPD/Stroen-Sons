"use client";

import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { getCategoryColorClasses } from "@/lib/category-colors";

type EventAttendee = {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    avatarUrl?: string | null;
};

export type EventWithDetails = {
    id: string;
    title: string;
    description: string | null;
    coverImage: string | null;
    location: string | null;
    isTba?: boolean;
    startAt: string;
    _count: { attendees: number };
    category: string | null;
    attendees: EventAttendee[];
    hasPublishedRecap?: boolean;
};

// ── Upcoming event — image card ──────────────────────────────────────────────
export function EventCardUpcoming({ event, color = "blue" }: { event: EventWithDetails; color?: string }) {
    const startDate = new Date(event.startAt);
    const day = startDate.toLocaleDateString("nb-NO", { day: "numeric" });
    const mon = startDate.toLocaleDateString("nb-NO", { month: "short" }).replace(".", "").toUpperCase();
    const time = startDate.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });

    return (
        <Link href={`/events/${event.id}`} className="block group">
            <article className="bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-md overflow-hidden transition-all duration-300 h-full flex flex-col shadow-sm">

                {/* Image */}
                <div className="relative aspect-[16/7] bg-gray-100 overflow-hidden shrink-0">
                    {event.coverImage ? (
                        <img
                            src={event.coverImage}
                            alt={event.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full bg-gray-900" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

                    {/* Date badge */}
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 flex flex-col items-center shadow-sm">
                        <span
                            className="text-xl font-normal leading-none text-gray-900"
                            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                        >
                            {day}
                        </span>
                        <span className="text-[9px] font-bold tracking-widest text-gray-400 mt-0.5">{mon}</span>
                    </div>

                    {/* Category badge */}
                    {event.category && (
                        <div className="absolute top-3 right-3">
                            <div className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] border backdrop-blur-md ${getCategoryColorClasses(color).bg} ${getCategoryColorClasses(color).text} ${getCategoryColorClasses(color).border}`}>
                                {event.category}
                            </div>
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="p-4 flex flex-col flex-1 gap-3">
                    {/* Location + time */}
                    <div className="flex items-center gap-2 text-[10px] font-medium text-gray-400">
                        {(event.location || event.isTba) && (
                            <>
                                <span className="material-symbols-outlined text-[13px]">location_on</span>
                                <span>{event.isTba ? "TBA" : event.location}</span>
                                <span className="text-gray-200">·</span>
                            </>
                        )}
                        <span className="material-symbols-outlined text-[13px]">schedule</span>
                        <span>{time}</span>
                    </div>

                    {/* Title */}
                    <h3
                        className="text-[17px] font-normal text-gray-900 leading-snug group-hover:text-gray-600 transition-colors"
                        style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                    >
                        {event.title}
                    </h3>

                    {event.description && (
                        <p className="text-[12px] text-gray-400 line-clamp-2 leading-relaxed">
                            {event.description}
                        </p>
                    )}

                    {/* Footer */}
                    <div className="mt-auto pt-3 flex items-center justify-between border-t border-gray-100">
                        {/* Attendees */}
                        {event.attendees.length > 0 ? (
                            <div className="flex items-center gap-2">
                                <div className="flex -space-x-1.5">
                                    {event.attendees.map((a, i) => (
                                        <Avatar
                                            key={i}
                                            src={a.avatarUrl ?? null}
                                            initials={
                                                a.firstName && a.lastName
                                                    ? `${a.firstName[0]}${a.lastName[0]}`.toUpperCase()
                                                    : (a.firstName || a.email || "?").substring(0, 2).toUpperCase()
                                            }
                                            className="w-5 h-5 border-[1.5px] border-white text-[9px]"
                                        />
                                    ))}
                                    {event._count.attendees > 3 && (
                                        <div className="w-5 h-5 rounded-full bg-gray-100 border-[1.5px] border-white flex items-center justify-center text-gray-500 text-[8px] font-bold">
                                            +{event._count.attendees - 3}
                                        </div>
                                    )}
                                </div>
                                <span className="text-[10px] text-gray-400">{event._count.attendees} påmeldt{event._count.attendees !== 1 ? "e" : ""}</span>
                            </div>
                        ) : (
                            <span className="text-[10px] text-gray-400">Ingen påmeldte ennå</span>
                        )}

                        <span className="material-symbols-outlined text-[18px] text-gray-300 group-hover:text-gray-500 transition-colors">
                            chevron_right
                        </span>
                    </div>
                </div>
            </article>
        </Link>
    );
}

// ── Past event — list row ────────────────────────────────────────────────────
export function EventCardPast({ event, color = "blue" }: { event: EventWithDetails; color?: string }) {
    const startDate = new Date(event.startAt);
    const day = startDate.toLocaleDateString("nb-NO", { day: "numeric" });
    const mon = startDate.toLocaleDateString("nb-NO", { month: "short" }).replace(".", "").toUpperCase();

    return (
        <Link href={`/events/${event.id}`} className="block group">
            <article className="flex items-stretch bg-white rounded-xl overflow-hidden border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all h-20">
                {/* Date column */}
                <div className="flex flex-col items-center justify-center px-4 py-4 bg-gray-50 border-r border-gray-100 shrink-0 w-16">
                    <span
                        className="text-xl font-normal leading-none text-gray-900"
                        style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                    >
                        {day}
                    </span>
                    <span className="text-[9px] font-bold tracking-widest text-gray-400 mt-0.5">{mon}</span>
                </div>

                {/* Thumbnail */}
                {event.coverImage && (
                    <div className="w-24 shrink-0 m-2 rounded-lg overflow-hidden">
                        <img
                            src={event.coverImage}
                            alt=""
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0 px-4 py-3 flex flex-col justify-center gap-1">
                    <div className="flex items-start justify-between gap-3">
                        <h4
                            className="font-normal text-[15px] text-gray-900 group-hover:text-gray-600 transition-colors leading-snug line-clamp-1"
                            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                        >
                            {event.title}
                        </h4>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-gray-400">
                        {event.location && (
                            <span className="flex items-center gap-1 shrink-0">
                                <span className="material-symbols-outlined text-[11px]">location_on</span>
                                {event.location}
                            </span>
                        )}
                        {event.description && (
                            <>
                                {event.location && <span className="text-gray-200">·</span>}
                                <span className="line-clamp-1">{event.description}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Chevron */}
                <div className="flex items-center pr-4 text-gray-300 group-hover:text-gray-500 transition-colors">
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                </div>
            </article>
        </Link>
    );
}

// Default export kept for backwards compatibility
export default function EventCard({ event, color = "blue" }: { event: EventWithDetails; color?: string }) {
    const isUpcoming = new Date(event.startAt) >= new Date();
    return isUpcoming
        ? <EventCardUpcoming event={event} color={color} />
        : <EventCardPast event={event} color={color} />;
}
