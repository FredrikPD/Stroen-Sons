"use client";

import { useState } from "react";
import { EventCardUpcoming, EventCardPast, EventWithDetails } from "./EventCard";

type EventsViewProps = {
    initialEvents: EventWithDetails[];
    categoryColorMap?: Record<string, string>;
};

export default function EventsView({ initialEvents, categoryColorMap = {} }: EventsViewProps) {
    const [search, setSearch] = useState("");
    const [yearFilter, setYearFilter] = useState<string>("ALL");

    const filteredEvents = initialEvents.filter(event =>
        event.title.toLowerCase().includes(search.toLowerCase()) ||
        event.location?.toLowerCase().includes(search.toLowerCase()) ||
        event.description?.toLowerCase().includes(search.toLowerCase())
    );

    const now = new Date();

    const upcomingEvents = filteredEvents
        .filter(e => new Date(e.startAt) >= now)
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

    const pastEvents = filteredEvents
        .filter(e => new Date(e.startAt) < now)
        .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

    const pastEventsByYear = pastEvents.reduce((acc, event) => {
        const year = new Date(event.startAt).getFullYear().toString();
        if (!acc[year]) acc[year] = [];
        acc[year].push(event);
        return acc;
    }, {} as Record<string, EventWithDetails[]>);

    const years = Object.keys(pastEventsByYear).sort((a, b) => Number(b) - Number(a));
    const displayedYears = yearFilter === "ALL" ? years : years.filter(y => y === yearFilter);

    return (
        <div className="flex flex-col gap-8">

            {/* ── Page Header ── */}
            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                <div>
                    <h1
                        className="text-3xl sm:text-4xl font-normal text-gray-900 leading-none"
                        style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                    >
                        Arrangementer
                    </h1>
                    <div className="flex items-center gap-3 mt-3">
                        <div className="h-px w-8 bg-gray-300" />
                        <p
                            className="text-[11px] text-gray-400 italic"
                            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                        >
                            Kommende og tidligere turer og samlinger
                        </p>
                    </div>
                </div>

                {/* ── Search ── */}
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <span className="material-symbols-outlined text-gray-400 text-[18px] shrink-0">search</span>
                    <input
                        type="text"
                        placeholder="Søk i arrangementer..."
                        className="w-36 sm:w-52 bg-transparent border-none outline-none text-[13px] text-gray-700 placeholder:text-gray-400"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="text-gray-300 hover:text-gray-500 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ── Kommende ── */}
            <div>
                <div className="flex items-center gap-4 mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Kommende</span>
                    <div className="flex-1 h-px bg-gray-100" />
                </div>

                {upcomingEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {upcomingEvents.map(event => (
                            <EventCardUpcoming
                                key={event.id}
                                event={event}
                                color={event.category ? categoryColorMap[event.category] : undefined}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-gray-400 italic py-4" style={{ fontFamily: "'Georgia', serif" }}>
                        Ingen kommende arrangementer.
                    </p>
                )}
            </div>

            {/* ── Tidligere ── */}
            <div>
                <div className="flex items-center gap-4 mb-5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Tidligere</span>
                    <div className="flex-1 h-px bg-gray-100" />

                    {/* Year filter */}
                    {years.length > 1 && (
                        <div className="relative">
                            <select
                                value={yearFilter}
                                onChange={(e) => setYearFilter(e.target.value)}
                                className="appearance-none pl-3 pr-7 py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-gray-600 focus:outline-none focus:border-gray-400 cursor-pointer transition-colors"
                            >
                                <option value="ALL">Alle år</option>
                                {years.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-[14px] pointer-events-none">
                                expand_more
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-8">
                    {displayedYears.length > 0 ? (
                        displayedYears.map(year => (
                            <div key={year} className="flex flex-col gap-2">
                                {/* Year label */}
                                <div className="flex items-center gap-3 mb-1">
                                    <span
                                        className="text-2xl font-normal text-gray-500 leading-none"
                                        style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                                    >
                                        {year}
                                    </span>
                                    <div className="flex-1 h-px bg-gray-100" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    {pastEventsByYear[year].map(event => (
                                        <EventCardPast
                                            key={event.id}
                                            event={event}
                                            color={event.category ? categoryColorMap[event.category] : undefined}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-gray-400 italic py-4" style={{ fontFamily: "'Georgia', serif" }}>
                            Ingen tidligere arrangementer funnet.
                        </p>
                    )}
                </div>
            </div>

        </div>
    );
}
