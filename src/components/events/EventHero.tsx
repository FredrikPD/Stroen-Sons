"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SERIF } from "@/components/posts/postPresentation";
import type { EventListItem } from "./EventCard";

type TimeLeft = { days: number; hours: number; minutes: number };

function calc(target: string): TimeLeft | null {
    const diff = +new Date(target) - +new Date();
    if (diff <= 0) return null;
    return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
    };
}

function Unit({ value, label, pad }: { value: number; label: string; pad?: boolean }) {
    return (
        <div className="flex flex-col items-center">
            <span
                className="text-4xl sm:text-5xl font-normal leading-none tabular-nums text-[#d8d2c8]"
                style={{ fontFamily: SERIF }}
            >
                {pad ? String(value).padStart(2, "0") : value}
            </span>
            <span className="mt-2 text-[9px] font-bold uppercase tracking-[0.22em] text-gray-500">{label}</span>
        </div>
    );
}

export function EventHero({ event, color, isAttending }: { event: EventListItem; color?: string; isAttending: boolean }) {
    // null until the first client tick — keeps SSR/CSR markup identical.
    const [time, setTime] = useState<TimeLeft | null>(null);

    useEffect(() => {
        const tick = () => setTime(calc(event.startAt));
        const first = setTimeout(tick, 0);
        const timer = setInterval(tick, 30000);
        return () => {
            clearTimeout(first);
            clearInterval(timer);
        };
    }, [event.startAt]);

    const start = new Date(event.startAt);
    const dateLong = start.toLocaleDateString("nb-NO", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
    const dateCap = dateLong.charAt(0).toUpperCase() + dateLong.slice(1);
    const time24 = start.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });

    return (
        <section
            className="relative overflow-hidden rounded-3xl text-white p-8 sm:p-10 lg:p-12"
            style={{ background: "#0f0e0c" }}
        >
            {event.coverImage ? (
                /* Cover photo background + dark scrim so the text stays legible */
                <>
                    <img
                        src={event.coverImage}
                        alt=""
                        aria-hidden
                        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                    />
                    <div
                        className="pointer-events-none absolute inset-0"
                        style={{
                            background:
                                "linear-gradient(90deg, rgba(15,14,12,0.95) 0%, rgba(15,14,12,0.88) 45%, rgba(15,14,12,0.58) 80%, rgba(15,14,12,0.42) 100%)",
                        }}
                    />
                </>
            ) : (
                /* Decorative watermark when there's no cover photo */
                <span
                    aria-hidden
                    className="pointer-events-none absolute -right-6 -bottom-16 select-none leading-none text-white/[0.03]"
                    style={{ fontFamily: SERIF, fontSize: "22rem" }}
                >
                    S
                </span>
            )}

            <div className="relative">
                <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400 mb-4">
                    <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                    Neste arrangement
                </p>

                <h2
                    className="text-4xl sm:text-5xl font-normal leading-[1.04] text-white"
                    style={{ fontFamily: SERIF }}
                >
                    {event.title}
                </h2>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-[13px] text-gray-400">
                    <span className="inline-flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-gray-500">calendar_today</span>
                        {event.isTba ? "Tidspunkt annonseres" : `${dateCap} · kl. ${time24}`}
                    </span>
                    {(event.location || event.isTba) && (
                        <span className="inline-flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-gray-500">location_on</span>
                            {event.isTba ? "TBA" : event.location}
                        </span>
                    )}
                </div>

                {/* Countdown — reserve height so the card doesn't jump on first tick */}
                <div className="mt-8 mb-9">
                    {time ? (
                        <div className="flex items-center gap-7 sm:gap-9">
                            <Unit value={time.days} label="Dager" />
                            <Unit value={time.hours} label="Timer" pad />
                            <Unit value={time.minutes} label="Min" pad />
                        </div>
                    ) : (
                        <div className="h-[68px]" aria-hidden />
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Link
                        href={`/events/${event.id}`}
                        className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-white text-gray-900 text-[13px] font-bold hover:bg-gray-100 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">description</span>
                        Se programmet
                    </Link>

                    {isAttending ? (
                        <span className="inline-flex items-center gap-1.5 text-[13px] text-gray-300 pl-1">
                            <span className="material-symbols-outlined text-[18px] text-emerald-400">check_circle</span>
                            Du er påmeldt
                        </span>
                    ) : (
                        <Link
                            href={`/events/${event.id}`}
                            className="inline-flex items-center h-11 px-5 rounded-lg border border-white/20 text-white text-[13px] font-bold hover:bg-white/10 transition-colors"
                        >
                            Meld deg på
                        </Link>
                    )}
                </div>
            </div>
        </section>
    );
}
