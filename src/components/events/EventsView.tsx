"use client";

import { useState } from "react";
import Link from "next/link";
import { SERIF } from "@/components/posts/postPresentation";
import { EventHero } from "./EventHero";
import { UpcomingEventRow, PastEventCard, type EventListItem } from "./EventCard";

type EventsViewProps = {
    featured: EventListItem | null;
    upcoming: EventListItem[];
    past: EventListItem[];
    attendingEventIds: string[];
    categoryColorMap?: Record<string, string>;
    isEditor?: boolean;
};

const ARCHIVE_PREVIEW = 4;

export default function EventsView({
    featured,
    upcoming,
    past,
    attendingEventIds,
    categoryColorMap = {},
    isEditor = false,
}: EventsViewProps) {
    const [showAllPast, setShowAllPast] = useState(false);
    const attending = new Set(attendingEventIds);
    const colorOf = (cat: string | null) => (cat ? categoryColorMap[cat] : undefined);

    const visiblePast = showAllPast ? past : past.slice(0, ARCHIVE_PREVIEW);

    return (
        <div className="flex flex-col gap-10 pb-4">

            {/* ── Header ── */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">
                        Foreningens kalender
                    </p>
                    <h1
                        className="text-3xl sm:text-4xl font-normal text-gray-900 leading-none"
                        style={{ fontFamily: SERIF }}
                    >
                        Arrangementer
                    </h1>
                </div>

                {isEditor && (
                    <div className="flex items-center gap-2.5 shrink-0">
                        <Link
                            href="/admin/events/new"
                            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-[#0f0e0c] text-white text-[12px] font-bold hover:bg-[#0f0e0c]/90 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                            Nytt arrangement
                        </Link>
                    </div>
                )}
            </div>

            {/* ── Separator ── */}
            <div className="h-px bg-gray-300 -mt-7" />

            {/* ── Hero: next event ── */}
            {featured && (
                <EventHero
                    event={featured}
                    color={colorOf(featured.category)}
                    isAttending={attending.has(featured.id)}
                />
            )}

            {/* ── Kommende ── */}
            <section>
                <div className="flex items-baseline justify-between gap-4 mb-2">
                    <h2 className="text-2xl font-normal text-gray-900" style={{ fontFamily: SERIF }}>
                        Kommende
                    </h2>
                    {upcoming.length > 0 && (
                        <span className="text-[12px] text-gray-400">
                            {upcoming.length} planlagt
                        </span>
                    )}
                </div>

                {upcoming.length > 0 ? (
                    <div className="flex flex-col gap-2">
                        {upcoming.map((event) => (
                            <UpcomingEventRow
                                key={event.id}
                                event={event}
                                color={colorOf(event.category)}
                                isAttending={attending.has(event.id)}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-400 italic py-4" style={{ fontFamily: SERIF }}>
                        {featured ? "Ingen flere planlagte arrangementer." : "Ingen kommende arrangementer."}
                    </p>
                )}
            </section>

            {/* ── Tidligere ── */}
            {past.length > 0 && (
                <section>
                    <div className="flex items-baseline justify-between gap-4 mb-5">
                        <h2 className="text-2xl font-normal text-gray-900" style={{ fontFamily: SERIF }}>
                            Tidligere
                        </h2>
                        {past.length > ARCHIVE_PREVIEW && (
                            <button
                                onClick={() => setShowAllPast((v) => !v)}
                                className="inline-flex items-center gap-1 text-[13px] font-semibold text-gray-500 hover:text-gray-900 transition-colors"
                            >
                                {showAllPast ? "Vis færre" : "Hele arkivet"}
                                <span className="material-symbols-outlined text-[16px]">
                                    {showAllPast ? "expand_less" : "arrow_forward"}
                                </span>
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {visiblePast.map((event) => (
                            <PastEventCard key={event.id} event={event} color={colorOf(event.category)} />
                        ))}
                    </div>
                </section>
            )}

            {/* Empty state — nothing at all */}
            {!featured && upcoming.length === 0 && past.length === 0 && (
                <div className="text-center py-16">
                    <p className="text-gray-400 italic text-sm" style={{ fontFamily: SERIF }}>
                        Ingen arrangementer ennå.
                    </p>
                </div>
            )}
        </div>
    );
}
