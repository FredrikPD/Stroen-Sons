"use client";

import Link from "next/link";

type EventAttendee = {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    // We might add profileImage if available later
};

export type EventWithDetails = {
    id: string;
    title: string;
    description: string | null;
    coverImage: string | null;
    location: string | null;
    startAt: string; // ISO Date string
    _count: {
        attendees: number;
    };
    attendees: EventAttendee[];
};

export default function EventCard({ event }: { event: EventWithDetails }) {
    const startDate = new Date(event.startAt);
    const month = startDate.toLocaleDateString("no-NO", { month: "short" }).toUpperCase().replace(".", "");
    const day = startDate.getDate();
    const time = startDate.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });

    // Helper for "Påmelding åpen" - maybe check if date is future?
    const isUpcoming = startDate > new Date();

    return (
        <Link href={`/events/${event.id}`} className="block group">
            <article className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                {/* Image Section */}
                <div className="relative h-56 bg-gray-100 overflow-hidden">
                    {event.coverImage ? (
                        <img
                            src={event.coverImage}
                            alt={event.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                            <span className="material-symbols-outlined text-4xl">image</span>
                        </div>
                    )}

                    {/* Date Badge */}
                    <div className="absolute top-4 left-4 bg-white rounded-lg shadow-sm p-1.5 min-w-[3.5rem] flex flex-col items-center text-center">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{month}</span>
                        <span className="text-xl font-bold text-gray-900 leading-none">{day}</span>
                    </div>

                    {/* Status Badge */}
                    {isUpcoming && (
                        <div className="absolute top-4 right-4 bg-[#E8DCC5] text-[#8C7648] px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm">
                            Påmelding åpen
                        </div>
                    )}
                </div>

                {/* Content Section */}
                <div className="p-6 flex flex-col flex-1 gap-4">
                    {/* Meta */}
                    <div className="flex items-center gap-3 text-xs font-medium text-gray-500">
                        {event.location && (
                            <>
                                <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[1rem]">location_on</span>
                                    <span>{event.location}</span>
                                </div>
                                <div className="h-4 w-[1px] bg-gray-200"></div>
                            </>
                        )}
                        <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[1rem]">schedule</span>
                            <span>{time}</span>
                        </div>
                    </div>

                    {/* Title & Desc */}
                    <div className="flex flex-col gap-2">
                        <h3 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-[#C5A66B] transition-colors">
                            {event.title}
                        </h3>
                        {event.description && (
                            <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                                {event.description}
                            </p>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-50">
                        {/* Avatar Stack */}
                        <div className="flex items-center">
                            {event.attendees.length > 0 ? (
                                <div className="flex -space-x-2">
                                    {event.attendees.map((attendee, i) => (
                                        <div
                                            key={i}
                                            className="w-7 h-7 rounded-full bg-gradient-to-br from-[#222] to-[#444] border-[1.5px] border-white flex items-center justify-center text-white text-[9px] font-bold"
                                            title={`${attendee.firstName} ${attendee.lastName}`}
                                        >
                                            {(attendee.firstName || attendee.email || "?").charAt(0).toUpperCase()}
                                        </div>
                                    ))}
                                    {event._count.attendees > 3 && (
                                        <div className="w-7 h-7 rounded-full bg-gray-100 border-[1.5px] border-white flex items-center justify-center text-gray-500 text-[9px] font-bold">
                                            +{event._count.attendees - 3}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <span className="text-xs text-gray-400 font-medium">Be the first to join</span>
                            )}
                        </div>

                        {/* Link */}
                        <div className="flex items-center gap-1 text-[#C5A66B] text-sm font-bold group-hover:gap-2 transition-all">
                            <span>Les mer</span>
                            <span className="material-symbols-outlined text-[1.1rem]">arrow_forward</span>
                        </div>
                    </div>
                </div>
            </article>
        </Link>
    );
}
