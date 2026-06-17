import Link from "next/link";
import Image from "next/image";
import { getCategoryColorClasses } from "@/lib/category-colors";
import { SERIF, StripePlaceholder } from "@/components/posts/postPresentation";

// ── Shared serialized shape ──────────────────────────────────────────────────
export type EventListItem = {
    id: string;
    title: string;
    description: string | null;
    coverImage: string | null;
    location: string | null;
    isTba?: boolean;
    category: string | null;
    startAt: string;
    attendeeCount: number;
    photoCount: number;
    maxAttendees: number | null;
    memberCost: number | null;
    hasPublishedRecap?: boolean;
};

// ── Upcoming event — editorial list row (date · details · progress · CTA) ─────
export function UpcomingEventRow({
    event,
    color = "gray",
    isAttending = false,
}: {
    event: EventListItem;
    color?: string;
    isAttending?: boolean;
}) {
    const start = new Date(event.startAt);
    const day = start.toLocaleDateString("nb-NO", { day: "numeric" });
    const mon = start.toLocaleDateString("nb-NO", { month: "short" }).replace(".", "").toUpperCase();
    const time = start.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
    const cat = getCategoryColorClasses(color);

    const hasCap = event.maxAttendees != null && event.maxAttendees > 0;
    const pct = hasCap ? Math.min(100, Math.round((event.attendeeCount / event.maxAttendees!) * 100)) : 0;

    return (
        <div className="group relative flex items-center gap-4 sm:gap-6 py-5 px-4 -mx-4 rounded-xl cursor-pointer transition-colors bg-white/40 hover:bg-white/70">
            {/* Date */}
            <Link
                href={`/events/${event.id}`}
                className="shrink-0 w-12 text-center after:absolute after:inset-0 after:content-['']"
            >
                <span className="block text-2xl font-normal leading-none text-gray-900" style={{ fontFamily: SERIF }}>
                    {day}
                </span>
                <span className="block text-[9px] font-bold tracking-[0.15em] text-gray-400 mt-1">{mon}</span>
            </Link>

            {/* Cover thumbnail */}
            <div className="relative shrink-0 w-24 sm:w-32 aspect-[16/10] rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                {event.coverImage ? (
                    <Image
                        src={event.coverImage}
                        alt={event.title}
                        fill
                        sizes="128px"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                ) : (
                    <StripePlaceholder label={(event.category ?? event.title).toLowerCase()} className="absolute inset-0 h-full w-full" />
                )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
                {event.category && (
                    <span className={`text-[10px] font-bold uppercase tracking-[0.18em] ${cat.text}`}>
                        {event.category}
                    </span>
                )}
                <h3
                    className="text-lg sm:text-xl font-normal text-gray-900 leading-snug mt-0.5 group-hover:text-gray-600 transition-colors"
                    style={{ fontFamily: SERIF }}
                >
                    {event.title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-gray-400">
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                        <span className="material-symbols-outlined text-[13px]">schedule</span>
                        {event.isTba ? "TBA" : `kl. ${time}`}
                    </span>
                    {(event.location || event.isTba) && (
                        <span className="inline-flex items-center gap-1 min-w-0">
                            <span className="material-symbols-outlined text-[13px] shrink-0">location_on</span>
                            <span className="truncate">{event.isTba ? "TBA" : event.location}</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Capacity */}
            <div className="hidden sm:flex flex-col items-end gap-1.5 w-32 shrink-0">
                {hasCap ? (
                    <>
                        <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full bg-[#0f0e0c] transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[11px] tabular-nums text-gray-400">
                            {event.attendeeCount}/{event.maxAttendees}
                        </span>
                    </>
                ) : (
                    <span className="text-[11px] tabular-nums text-gray-400">
                        {event.attendeeCount} påmeldt{event.attendeeCount === 1 ? "" : "e"}
                    </span>
                )}
            </div>

            {/* CTA */}
            <Link
                href={`/events/${event.id}`}
                className={`relative z-10 shrink-0 inline-flex items-center justify-center gap-1 h-9 px-4 rounded-lg text-[12px] font-bold transition-colors ${
                    isAttending
                        ? "border border-gray-200 text-gray-500 hover:bg-gray-50"
                        : "bg-[#0f0e0c] text-white hover:bg-[#0f0e0c]/90"
                }`}
            >
                {isAttending ? (
                    <>
                        <span className="material-symbols-outlined text-[15px]">check</span>
                        Påmeldt
                    </>
                ) : (
                    "Meld på"
                )}
            </Link>
        </div>
    );
}

// ── Past event — cover card ───────────────────────────────────────────────────
export function PastEventCard({ event, color = "gray" }: { event: EventListItem; color?: string }) {
    const start = new Date(event.startAt);
    const monthYear = start.toLocaleDateString("nb-NO", { month: "long", year: "numeric" });
    const monthYearCap = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
    const cat = getCategoryColorClasses(color);

    return (
        <Link href={`/events/${event.id}`} className="group block">
            <article className="flex flex-col">
                {/* Cover */}
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-gray-200 bg-gray-50">
                    {event.coverImage ? (
                        <Image
                            src={event.coverImage}
                            alt={event.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                    ) : (
                        <StripePlaceholder label={event.title.toLowerCase()} className="absolute inset-0 w-full h-full" />
                    )}
                </div>

                {/* Body */}
                <div className="mt-3.5">
                    {event.category && (
                        <span className={`text-[10px] font-bold uppercase tracking-[0.18em] ${cat.text}`}>
                            {event.category}
                        </span>
                    )}
                    <h3
                        className="text-xl font-normal text-gray-900 leading-snug mt-0.5 group-hover:text-gray-600 transition-colors"
                        style={{ fontFamily: SERIF }}
                    >
                        {event.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                        <span>{monthYearCap}</span>
                        <span className="inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">group</span>
                            {event.attendeeCount}
                        </span>
                        {event.photoCount > 0 && (
                            <span className="inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">photo_library</span>
                                {event.photoCount}
                            </span>
                        )}
                    </div>
                </div>
            </article>
        </Link>
    );
}
