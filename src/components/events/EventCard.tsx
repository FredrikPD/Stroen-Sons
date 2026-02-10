"use client";

import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { getCategoryColorClasses } from "@/lib/category-colors";

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
    isTba?: boolean;
    startAt: string; // ISO Date string
    _count: {
        attendees: number;
    };
    category: string | null;
    attendees: EventAttendee[];
};

export default function EventCard({ event, color = "blue" }: { event: EventWithDetails; color?: string }) {
    const startDate = new Date(event.startAt);
    const month = startDate.toLocaleDateString("no-NO", { month: "short" }).toUpperCase().replace(".", "");
    const day = startDate.getDate();
    const time = startDate.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });

    // Helper for "Påmelding åpen" - maybe check if date is future?
    const isUpcoming = startDate > new Date();

    return (
        <Link href={`/events/${event.id}`} className="block group">
            <article className="bg-white rounded-2xl border border-gray-200/80 shadow-md hover:shadow-xl hover:border-gray-300 overflow-hidden transition-all duration-300 h-full flex flex-col">
                {/* Image Section */}
                <div className="relative h-32 bg-gray-100 overflow-hidden">
                    {event.coverImage ? (
                        <img
                            src={event.coverImage}
                            alt={event.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                            <span className="material-symbols-outlined text-3xl">image</span>
                        </div>
                    )}

                    {/* Date Badge */}
                    <div className="absolute top-3 left-3 bg-white rounded-lg shadow-sm p-1.5 min-w-[3rem] flex flex-col items-center text-center">
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">{month}</span>
                        <span className="text-lg font-bold text-gray-900 leading-none">{day}</span>
                    </div>

                    {/* Status & Category Badges */}
                    <div className="absolute top-3 right-3 flex flex-row-reverse items-center gap-2">
                        {isUpcoming && (
                            <div className="bg-[#EEF2FF] text-[#4F46E5] px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wide backdrop-blur-sm">
                                Påmelding åpen
                            </div>
                        )}
                        {event.category && (
                            <div className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border backdrop-blur-md ${getCategoryColorClasses(color).bg} ${getCategoryColorClasses(color).text} ${getCategoryColorClasses(color).border}`}>
                                {event.category}
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-4 flex flex-col flex-1 gap-3">
                    {/* Meta */}
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {(event.location || event.isTba) && (
                            <>
                                <div className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">location_on</span>
                                    <span>{event.isTba ? "TBA" : event.location}</span>
                                </div>
                                <div className="h-3 w-[1px] bg-gray-200"></div>
                            </>
                        )}
                        <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">schedule</span>
                            <span>{time}</span>
                        </div>
                    </div>

                    {/* Title & Desc */}
                    <div className="flex flex-col gap-1.5">
                        <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-[#4F46E5] transition-colors">
                            {event.title}
                        </h3>
                        {event.description && (
                            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                {event.description}
                            </p>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="mt-auto pt-3 flex items-center justify-between border-t border-gray-50">
                        {/* Avatar Stack */}
                        <div className="flex items-center">
                            {event.attendees.length > 0 ? (
                                <div className="flex -space-x-1.5">
                                    {event.attendees.map((attendee, i) => (
                                        <Avatar
                                            key={i}
                                            initials={attendee.firstName && attendee.lastName ? `${attendee.firstName[0]}${attendee.lastName[0]}`.toUpperCase() : (attendee.firstName || attendee.email || "?").substring(0, 2).toUpperCase()}
                                            alt={`${attendee.firstName || ''} ${attendee.lastName || ''}`}
                                            className="w-6 h-6 border-[1.5px] border-white text-xs"
                                        />
                                    ))}
                                    {event._count.attendees > 3 && (
                                        <div className="w-6 h-6 rounded-full bg-gray-100 border-[1.5px] border-white flex items-center justify-center text-gray-500 text-[8px] font-bold">
                                            +{event._count.attendees - 3}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <span className="text-[10px] text-gray-400 font-medium">Bli med</span>
                            )}
                        </div>

                        {/* Link */}
                        <div className="flex items-center gap-1 text-[#4F46E5] text-xs font-bold group-hover:gap-1.5 transition-all">
                            <span>Les mer</span>
                            <span className="material-symbols-outlined text-base">arrow_forward</span>
                        </div>
                    </div>
                </div>
            </article>
        </Link>
    );
}
