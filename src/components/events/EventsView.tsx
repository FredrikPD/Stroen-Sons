"use client";

import { useState } from "react";
import EventCard, { EventWithDetails } from "./EventCard";

type EventsViewProps = {
    initialEvents: EventWithDetails[];
};

export default function EventsView({ initialEvents }: EventsViewProps) {
    const [search, setSearch] = useState("");
    const [yearFilter, setYearFilter] = useState<string>("ALL");

    // Filter events based on search
    const filteredEvents = initialEvents.filter(event =>
        event.title.toLowerCase().includes(search.toLowerCase()) ||
        event.location?.toLowerCase().includes(search.toLowerCase()) ||
        event.description?.toLowerCase().includes(search.toLowerCase())
    );

    const now = new Date();

    // Sort logic: Upcoming (ASC), Past (DESC)
    const upcomingEvents = filteredEvents
        .filter(e => new Date(e.startAt) >= now)
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

    const pastEvents = filteredEvents
        .filter(e => new Date(e.startAt) < now)
        .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

    // Group past events by year
    const pastEventsByYear = pastEvents.reduce((acc, event) => {
        const year = new Date(event.startAt).getFullYear().toString();
        if (!acc[year]) acc[year] = [];
        acc[year].push(event);
        return acc;
    }, {} as Record<string, EventWithDetails[]>);

    const years = Object.keys(pastEventsByYear).sort((a, b) => Number(b) - Number(a));

    const displayedYears = yearFilter === "ALL" ? years : years.filter(y => y === yearFilter);

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold text-gray-900">Events & Arrangementer</h1>
                    <p className="text-gray-500 max-w-2xl text-sm md:text-base leading-relaxed">
                        Oversikt over kommende og tidligere arrangementer.
                    </p>
                </div>

                {/* Search Bar */}
                <div className="relative max-w-md">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                    <input
                        type="text"
                        placeholder="Søk i arrangementer..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C5A66B]/20 focus:border-[#C5A66B] transition-all text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Separator */}
            <div className="w-full border-b border-gray-200" />

            {/* UPCOMING EVENTS */}
            <div>
                <div className="flex items-center gap-2 mb-6">
                    <span className="material-symbols-outlined text-[#C5A66B]">celebration</span>
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Kommende Arrangementer</h2>
                </div>

                {upcomingEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {upcomingEvents.map(event => (
                            <EventCard key={event.id} event={event} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <p className="text-gray-400 text-sm">Ingen kommende arrangementer funnet.</p>
                    </div>
                )}
            </div>

            {/* PREVIOUS EVENTS */}
            <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pt-8 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400">history</span>
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Tidligere Arrangementer</h2>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-3">
                        {/* Simplistic sort view (static for now as we auto-sort newest first) */}
                        <div className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg flex items-center gap-2 text-xs font-medium text-gray-600 cursor-not-allowed opacity-70">
                            <span className="material-symbols-outlined text-[1rem]">sort</span>
                            <span>Dato: Nyeste først</span>
                        </div>

                        {/* Year Filter */}
                        <div className="relative">
                            <select
                                value={yearFilter}
                                onChange={(e) => setYearFilter(e.target.value)}
                                className="appearance-none pl-9 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-900 focus:outline-none focus:border-[#C5A66B] cursor-pointer"
                            >
                                <option value="ALL">Alle år</option>
                                {years.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[1rem] pointer-events-none">calendar_month</span>
                            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[1rem] pointer-events-none">expand_more</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-12">
                    {displayedYears.length > 0 ? (
                        displayedYears.map(year => (
                            <div key={year} className="flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-6 w-1 bg-[#C5A66B] rounded-full"></div>
                                    <h3 className="text-xl font-bold text-gray-400">{year}</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {pastEventsByYear[year].map(event => (
                                        <EventCard key={event.id} event={event} />
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-gray-400 text-sm">Ingen tidligere arrangementer funnet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
