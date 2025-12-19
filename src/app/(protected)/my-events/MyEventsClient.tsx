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

export default function MyEventsClient({ initialData }: MyEventsClientProps) {
    const [filter, setFilter] = useState<'ALL' | 'UPCOMING' | 'PAST' | 'UNPAID'>('UPCOMING'); // Default to Upcoming as per screenshot focus? Or 'ALL'? Screenshot shows 'Kommende' active.

    const { events, stats } = initialData;

    const filteredEvents = events.filter(event => {
        if (filter === 'UPCOMING') return !event.isPast;
        if (filter === 'PAST') return event.isPast;
        if (filter === 'UNPAID') return event.status === 'PENDING_PAYMENT';
        return true;
    });

    // Helper for date formatting
    const formatDateBadge = (date: Date) => {
        return {
            month: format(date, 'MMM', { locale: nb }).toUpperCase().replace('.', ''),
            day: format(date, 'd')
        };
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Mine Arrangementer</h1>
                <p className="text-gray-500 mt-1">Oversikt over dine påmeldinger, status og betalinger.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Upcoming */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-blue-500">
                        <span className="material-symbols-outlined text-lg">event</span>
                        <span className="text-xs font-bold uppercase tracking-widest">Kommende</span>
                    </div>
                    <div className="mb-2">
                        <span className="text-4xl font-extrabold text-gray-900">{stats.upcomingCount}</span>
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                        {stats.nextEvent ? `Neste: ${stats.nextEvent.title}` : "Ingen kommende"}
                        {stats.nextEvent && (
                            <span className="text-gray-400"> ({Math.ceil((new Date(stats.nextEvent.startAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dager)</span>
                        )}
                    </div>
                </div>

                {/* Unpaid */}
                <div className={`border rounded-2xl p-6 shadow-sm ${stats.unpaidCount > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
                    <div className={`flex items-center gap-2 mb-2 ${stats.unpaidCount > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                        <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
                        <span className="text-xs font-bold uppercase tracking-widest">Venter betaling</span>
                    </div>
                    <div className="mb-2">
                        <span className={`text-4xl font-extrabold ${stats.unpaidCount > 0 ? 'text-orange-900' : 'text-gray-900'}`}>{stats.unpaidCount}</span>
                    </div>
                    <div className={`text-sm ${stats.unpaidCount > 0 ? 'text-orange-700 font-medium' : 'text-gray-500'}`}>
                        {stats.unpaidCount > 0 ? "Vennligst betal snarest" : "Alt er ajour!"}
                    </div>
                </div>

                {/* Total this year */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-gray-500">
                        <span className="material-symbols-outlined text-lg">history</span>
                        <span className="text-xs font-bold uppercase tracking-widest">Totalt i år</span>
                    </div>
                    <div className="mb-2">
                        <span className="text-4xl font-extrabold text-gray-900">{stats.totalThisYear}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                        Du er en aktiv bidragsyter!
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-6 border-b border-gray-200 pb-px overflow-x-auto">
                <button
                    onClick={() => setFilter('ALL')}
                    className={`pb-3 text-sm font-medium transition-colors relative whitespace-nowrap ${filter === 'ALL' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Alle
                    {filter === 'ALL' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
                </button>
                <button
                    onClick={() => setFilter('UPCOMING')}
                    className={`pb-3 text-sm font-medium transition-colors relative whitespace-nowrap ${filter === 'UPCOMING' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Kommende
                    {filter === 'UPCOMING' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
                </button>
                <button
                    onClick={() => setFilter('PAST')}
                    className={`pb-3 text-sm font-medium transition-colors relative whitespace-nowrap ${filter === 'PAST' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Tidligere
                    {filter === 'PAST' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
                </button>
                <button
                    onClick={() => setFilter('UNPAID')}
                    className={`pb-3 text-sm font-medium transition-colors relative whitespace-nowrap flex items-center gap-2 ${filter === 'UNPAID' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Ubetalte
                    {stats.unpaidCount > 0 && <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full text-[10px] font-bold">{stats.unpaidCount}</span>}
                    {filter === 'UNPAID' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
                </button>
            </div>

            {/* List */}
            <div className="space-y-4">
                {filteredEvents.length === 0 && (
                    <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <span className="material-symbols-outlined text-4xl mb-2 text-gray-300">event_busy</span>
                        <p>Ingen arrangementer funnet i denne kategorien.</p>
                    </div>
                )}

                {filteredEvents.map(event => {
                    const badge = formatDateBadge(new Date(event.startAt));

                    return (
                        <Link href={`/events/${event.id}`} key={event.id} className="group relative block bg-white border border-gray-100 rounded-2xl p-4 md:p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 hover:-translate-y-[2px]">
                            {/* Subtle Hover Gradient Background */}
                            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />

                            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
                                {/* Date Badge */}
                                <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-b from-zinc-800 to-zinc-950 text-white rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-zinc-900/20 group-hover:scale-[1.02] transition-transform duration-300">
                                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{badge.month}</span>
                                    <span className="text-2xl font-bold leading-none">{badge.day}</span>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0 py-1">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2 truncate group-hover:text-blue-600 transition-colors">{event.title}</h3>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                        <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                                            <span className="material-symbols-outlined text-base text-gray-400">schedule</span>
                                            {format(new Date(event.startAt), 'HH:mm')}
                                        </div>
                                        {event.location && (
                                            <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100/10 truncate max-w-[200px]">
                                                <span className="material-symbols-outlined text-base text-gray-400">location_on</span>
                                                {event.location}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Tags & Actions */}
                                <div className="flex flex-col items-end gap-3 w-full md:w-auto mt-4 md:mt-0 pl-4 border-l border-gray-100/50">
                                    {/* Role */}
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${event.role === 'HOST'
                                        ? 'bg-purple-50 text-purple-700 border-purple-100 shadow-sm'
                                        : 'bg-white text-gray-500 border-gray-200'
                                        }`}>
                                        {event.role === 'HOST' ? 'Arrangør' : 'Gjest'}
                                    </span>

                                    {/* Status */}
                                    <div className="flex items-center gap-3">
                                        {event.status === 'PENDING_PAYMENT' && (
                                            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 flex items-center gap-1.5 border border-amber-100 shadow-sm">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                Venter betaling
                                            </span>
                                        )}
                                        {event.status === 'CONFIRMED' && (
                                            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 flex items-center gap-1.5 border border-emerald-100 shadow-sm">
                                                <span className="material-symbols-outlined text-sm">verified</span>
                                                Bekreftet
                                            </span>
                                        )}
                                        {event.status === 'FREE' && (
                                            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 flex items-center gap-1.5 border border-emerald-100 shadow-sm">
                                                <span className="material-symbols-outlined text-sm">savings</span>
                                                Gratis
                                            </span>
                                        )}

                                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                            <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
