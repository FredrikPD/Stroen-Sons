"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface EventItem {
    id: string;
    title: string;
    location: string | null;
    startAt: Date;
    role: 'HOST' | 'GUEST';
    status: 'CONFIRMED' | 'PENDING_PAYMENT' | 'FREE' | 'WAITLIST';
    paymentRequestId?: string;
    isPast: boolean;
    cost: number | null;
}

interface Stats {
    upcomingCount: number;
    nextEvent: EventItem | null;
    unpaidCount: number;
    totalThisYear: number;
}

interface MyEventsClientProps {
    initialData: {
        events: EventItem[];
        stats: Stats;
    };
}

const FILTERS = [
    { key: 'UPCOMING', label: 'Kommende' },
    { key: 'PAST',     label: 'Tidligere' },
    { key: 'UNPAID',   label: 'Ubetalte' },
    { key: 'ALL',      label: 'Alle' },
] as const;

export default function MyEventsClient({ initialData }: MyEventsClientProps) {
    const [filter, setFilter] = useState<'ALL' | 'UPCOMING' | 'PAST' | 'UNPAID'>('UPCOMING');

    const { events, stats } = initialData;

    const filteredEvents = events.filter(event => {
        if (filter === 'UPCOMING') return !event.isPast;
        if (filter === 'PAST')     return event.isPast;
        if (filter === 'UNPAID')   return event.status === 'PENDING_PAYMENT';
        return true;
    });

    return (
        <div className="flex flex-col gap-8 min-w-0 overflow-x-hidden">

            {/* ── Page Header ─────────────────────────────────────────── */}
            <div className="flex items-end justify-between gap-4 pt-1">
                <div>
                    <h1
                        className="text-3xl sm:text-4xl font-normal text-gray-900 leading-none"
                        style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                    >
                        <em>Mine arrangementer</em>
                    </h1>
                    <div className="flex items-center gap-3 mt-3">
                        <div className="h-px w-8 bg-gray-300" />
                        <p className="text-[11px] text-gray-400 italic" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                            Påmeldinger, status og betalinger
                        </p>
                    </div>
                </div>
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest shrink-0 hidden sm:block">
                    {events.length} totalt
                </p>
            </div>

            {/* ── Stats bar ───────────────────────────────────────────── */}
            <div
                className="rounded-2xl p-5 flex items-center gap-0"
                style={{ background: "linear-gradient(145deg, #1a1a1a 0%, #111111 100%)", boxShadow: "0 4px 20px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)" }}
            >
                <div className="flex-1 min-w-0 pr-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-gray-500 mb-1 truncate">Kommende</p>
                    <p className="font-bold text-gray-100 text-2xl leading-none" style={{ fontFamily: "'Georgia', serif" }}>
                        {stats.upcomingCount}
                    </p>
                </div>
                <div className="w-px h-8 bg-white/10 shrink-0" />
                <div className="flex-1 min-w-0 px-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-gray-500 mb-1 truncate">Totalt i år</p>
                    <p className="font-bold text-gray-100 text-2xl leading-none" style={{ fontFamily: "'Georgia', serif" }}>
                        {stats.totalThisYear}
                    </p>
                </div>
                <div className="w-px h-8 bg-white/10 shrink-0" />
                <div className="flex-1 min-w-0 pl-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-gray-500 mb-1 truncate">Venter betaling</p>
                    <p className={`font-bold text-2xl leading-none ${stats.unpaidCount > 0 ? "text-amber-400" : "text-gray-100"}`} style={{ fontFamily: "'Georgia', serif" }}>
                        {stats.unpaidCount}
                    </p>
                </div>
                {stats.nextEvent && (
                    <>
                        <div className="w-px h-8 bg-white/10 hidden sm:block shrink-0" />
                        <div className="hidden sm:block min-w-0 pl-4">
                            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-gray-500 mb-1">Neste</p>
                            <p className="text-sm font-bold text-gray-100 truncate max-w-[160px]">{stats.nextEvent.title}</p>
                        </div>
                    </>
                )}
            </div>

            {/* ── Filters ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-1 border-b border-gray-100 overflow-x-auto">
                {FILTERS.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider shrink-0 border-b-2 transition-colors flex items-center gap-1.5 ${
                            filter === key
                                ? "border-gray-900 text-gray-900"
                                : "border-transparent text-gray-400 hover:text-gray-600"
                        }`}
                    >
                        {label}
                        {key === 'UNPAID' && stats.unpaidCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[9px] font-bold">
                                {stats.unpaidCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Event list ──────────────────────────────────────────── */}
            <div className="flex flex-col gap-2">
                {filteredEvents.length === 0 && (
                    <div className="text-center py-8 rounded-xl border border-dashed border-gray-200">
                        <p className="text-xs text-gray-400 italic" style={{ fontFamily: "'Georgia', serif" }}>
                            Ingen arrangementer funnet i denne kategorien.
                        </p>
                    </div>
                )}

                {filteredEvents.map(event => {
                    const d = new Date(event.startAt);
                    const day = format(d, 'd');
                    const mon = format(d, 'MMM', { locale: nb }).toUpperCase().replace('.', '');

                    return (
                        <Link
                            key={event.id}
                            href={`/events/${event.id}`}
                            className="group flex items-stretch bg-white rounded-xl overflow-hidden border border-gray-200 hover:border-gray-400 hover:shadow-sm transition-all"
                        >
                            {/* Date column */}
                            <div className={`flex flex-col items-center justify-center px-4 py-4 border-r border-gray-100 shrink-0 w-16 ${event.isPast ? "bg-gray-50" : "bg-gray-50"}`}>
                                <span
                                    className={`text-xl font-normal leading-none ${event.isPast ? "text-gray-400" : "text-gray-900"}`}
                                    style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                                >
                                    {day}
                                </span>
                                <span className="text-[9px] font-bold tracking-widest text-gray-400 mt-0.5">{mon}</span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 px-4 py-3.5 flex flex-col justify-center">
                                <h3 className={`font-bold text-sm leading-snug truncate group-hover:text-gray-600 transition-colors ${event.isPast ? "text-gray-400" : "text-gray-900"}`}>
                                    {event.title}
                                </h3>
                                <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-xs text-gray-400">{format(d, 'HH:mm')}</span>
                                    {event.location && (
                                        <>
                                            <span className="text-gray-200">·</span>
                                            <span className="text-xs text-gray-400 truncate">{event.location}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Right: role + status */}
                            <div className="flex items-center gap-3 px-4 border-l border-gray-100 shrink-0">
                                <div className="flex flex-col items-end gap-1.5">
                                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                        event.role === 'HOST' ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
                                    }`}>
                                        {event.role === 'HOST' ? 'Arrangør' : 'Gjest'}
                                    </span>
                                    {event.status === 'PENDING_PAYMENT' && (
                                        <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 uppercase tracking-wide">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                            Ubetalt
                                        </span>
                                    )}
                                    {event.status === 'CONFIRMED' && (
                                        <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 uppercase tracking-wide">
                                            <span className="material-symbols-outlined text-[11px]">check</span>
                                            Bekreftet
                                        </span>
                                    )}
                                    {event.status === 'FREE' && (
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Gratis</span>
                                    )}
                                    {event.status === 'WAITLIST' && (
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Venteliste</span>
                                    )}
                                </div>
                                <span className="material-symbols-outlined text-base text-gray-300 group-hover:text-gray-500 transition-colors">chevron_right</span>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
