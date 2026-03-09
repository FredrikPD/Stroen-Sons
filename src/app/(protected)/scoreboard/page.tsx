import { ensureMember } from "@/server/auth/ensureMember";
import { db } from "@/server/db";
import { Avatar } from "@/components/Avatar";
import Link from "next/link";

export const metadata = {
    title: "Scoreboard",
};

/* ── Color maps ────────────────────────────────────────────── */

const placeStyles: Record<number, { badge: string; border: string; label: string }> = {
    1: {
        badge: "bg-[#F5C518] text-[#7a5c00]",
        border: "border-yellow-200",
        label: "Vinner",
    },
    2: {
        badge: "bg-[#C0C0C0] text-[#4a4a4a]",
        border: "border-gray-300",
        label: "2. plass",
    },
    3: {
        badge: "bg-[#CD7F32] text-white",
        border: "border-orange-200",
        label: "3. plass",
    },
};

/* ── Components ────────────────────────────────────────────── */

function PlaceBadge({ place }: { place: number }) {
    const style = placeStyles[place];
    return (
        <span
            className={`inline-flex items-center justify-center size-7 shrink-0 rounded-full text-xs font-bold shadow-sm ${style.badge}`}
        >
            {place}
        </span>
    );
}

function MemberList({ members }: { members: { name: string; avatarUrl?: string | null }[] }) {
    return (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
            {members.map((m) => (
                <div key={m.name} className="flex items-center gap-1.5">
                    <Avatar
                        src={m.avatarUrl ?? null}
                        initials={m.name.substring(0, 2)}
                        alt={m.name}
                        size="xs"
                    />
                    <span className="text-xs text-gray-600">{m.name}</span>
                </div>
            ))}
        </div>
    );
}

type TeamEntry = {
    place: number;
    teamName: string;
    members: { name: string; avatarUrl?: string | null }[];
};

type IndividualEntry = {
    place: number;
    name: string;
    avatarUrl?: string | null;
};

function TeamResultCard({ entry }: { entry: TeamEntry }) {
    const style = placeStyles[entry.place];
    return (
        <div className={`flex flex-col gap-2 rounded-xl border ${style.border} bg-white p-3 min-w-[140px] flex-1`}>
            <div className="flex items-center gap-2">
                <PlaceBadge place={entry.place} />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {style.label}
                </span>
            </div>
            <p className="text-sm font-bold text-gray-900">{entry.teamName}</p>
            <MemberList members={entry.members} />
        </div>
    );
}

function IndividualResultCard({ entry }: { entry: IndividualEntry }) {
    const style = placeStyles[entry.place];
    return (
        <div className={`flex flex-col gap-2 rounded-xl border ${style.border} bg-white p-3 min-w-[140px] flex-1`}>
            <div className="flex items-center gap-2">
                <PlaceBadge place={entry.place} />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {style.label}
                </span>
            </div>
            <div className="flex items-center gap-1.5">
                <Avatar
                    src={entry.avatarUrl ?? null}
                    initials={entry.name.substring(0, 2)}
                    alt={entry.name}
                    size="xs"
                    className="shrink-0"
                />
                <span className="text-xs text-gray-600">{entry.name}</span>
            </div>
        </div>
    );
}

type EventWithPodium = {
    id: string;
    title: string;
    startAt: Date;
    podiumType: "INDIVIDUAL" | "TEAM";
    entries: {
        place: number;
        teamName: string | null;
        memberId: string | null;
        memberFirstName: string | null;
        memberLastName: string | null;
        memberAvatarUrl: string | null;
        teamMembers: { firstName: string | null; lastName: string | null; avatarUrl: string | null }[];
    }[];
};

function EventCard({ event }: { event: EventWithPodium }) {
    const dateStr = event.startAt.toLocaleDateString("nb-NO", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex flex-col lg:flex-row">
                {/* Left: event info */}
                <div className="p-5 lg:w-2/5 flex flex-col gap-2 justify-center">
                    <h3 className="text-lg font-bold text-gray-900">{event.title}</h3>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                        <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                        {dateStr}
                    </div>
                    <Link
                        href={`/events/${event.id}`}
                        className="text-sm font-semibold text-[#0d1419] hover:text-slate-600 transition-colors mt-1 inline-flex items-center gap-1"
                    >
                        Se arrangement
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </Link>
                </div>

                {/* Right: results */}
                <div className="flex-1 p-5 flex flex-wrap gap-3 items-center border-t lg:border-t-0 lg:border-l border-gray-100">
                    {event.entries.map((entry) =>
                        event.podiumType === "TEAM" ? (
                            <TeamResultCard
                                key={entry.place}
                                entry={{
                                    place: entry.place,
                                    teamName: entry.teamName || "Uten navn",
                                    members: entry.teamMembers.map((tm) => ({
                                        name: `${tm.firstName || ""} ${tm.lastName || ""}`.trim() || "?",
                                        avatarUrl: tm.avatarUrl,
                                    })),
                                }}
                            />
                        ) : (
                            <IndividualResultCard
                                key={entry.place}
                                entry={{
                                    place: entry.place,
                                    name: `${entry.memberFirstName || ""} ${entry.memberLastName || ""}`.trim() || "Ukjent",
                                    avatarUrl: entry.memberAvatarUrl,
                                }}
                            />
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

function SeasonSection({ year, events, isCurrent }: { year: number; events: EventWithPodium[]; isCurrent: boolean }) {
    return (
        <section className="flex flex-col gap-5">
            {/* Year header */}
            <div className="flex items-center gap-4">
                <h2 className="text-3xl font-bold text-[#0d1419] shrink-0">{year}</h2>
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 shrink-0">
                    {isCurrent ? "Nåværende sesong" : "Fullført sesong"}
                </span>
            </div>

            {/* Events */}
            <div className="flex flex-col gap-4">
                {events.map((event) => (
                    <EventCard key={event.id} event={event} />
                ))}
            </div>
        </section>
    );
}

function YearFilter({ years, selected }: { years: number[]; selected: number | null }) {
    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            <Link
                href="/scoreboard"
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    !selected ? "bg-[#0d1419] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
            >
                Alle
            </Link>
            {years.map((year) => (
                <Link
                    key={year}
                    href={`/scoreboard?year=${year}`}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        selected === year ? "bg-[#0d1419] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                    {year}
                </Link>
            ))}
        </div>
    );
}

/* ── Page ───────────────────────────────────────────────────── */

interface ScoreboardPageProps {
    searchParams: Promise<{ year?: string }>;
}

export default async function ScoreboardPage({ searchParams }: ScoreboardPageProps) {
    await ensureMember();
    const { year: yearParam } = await searchParams;
    const selectedYear = yearParam ? parseInt(yearParam, 10) : null;

    const events = await db.event.findMany({
        where: {
            recap: {
                podium: {
                    isNot: null,
                },
            },
        },
        include: {
            recap: {
                include: {
                    podium: {
                        include: {
                            entries: {
                                orderBy: { place: "asc" },
                                include: {
                                    member: {
                                        select: { firstName: true, lastName: true, avatarUrl: true },
                                    },
                                    teamMembers: {
                                        include: {
                                            member: {
                                                select: { firstName: true, lastName: true, avatarUrl: true },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        orderBy: { startAt: "desc" },
    });

    // Transform and group by year
    const eventsWithPodium: EventWithPodium[] = events
        .filter((e) => e.recap?.podium)
        .map((e) => ({
            id: e.id,
            title: e.title,
            startAt: e.startAt,
            podiumType: e.recap!.podium!.type as "INDIVIDUAL" | "TEAM",
            entries: e.recap!.podium!.entries.map((entry) => ({
                place: entry.place,
                teamName: entry.teamName,
                memberId: entry.memberId,
                memberFirstName: entry.member?.firstName ?? null,
                memberLastName: entry.member?.lastName ?? null,
                memberAvatarUrl: entry.member?.avatarUrl ?? null,
                teamMembers: entry.teamMembers.map((tm) => ({
                    firstName: tm.member.firstName,
                    lastName: tm.member.lastName,
                    avatarUrl: tm.member.avatarUrl,
                })),
            })),
        }));

    const grouped = new Map<number, EventWithPodium[]>();
    for (const event of eventsWithPodium) {
        const year = event.startAt.getFullYear();
        if (!grouped.has(year)) grouped.set(year, []);
        grouped.get(year)!.push(event);
    }

    const currentYear = new Date().getFullYear();
    const allYears = [...grouped.keys()].sort((a, b) => b - a);
    const visibleYears = selectedYear && grouped.has(selectedYear) ? [selectedYear] : allYears;

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex flex-col w-full gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">Scoreboard</h1>
                    <p className="text-gray-500 text-sm">Resultater og plasseringer fra arrangementer.</p>
                </div>
                {allYears.length > 1 && (
                    <YearFilter years={allYears} selected={selectedYear} />
                )}
            </div>

            {allYears.length === 0 && (
                <p className="text-gray-400 text-sm">Ingen arrangementer med podium ennå.</p>
            )}

            {/* Seasons */}
            {visibleYears.map((year) => (
                <SeasonSection
                    key={year}
                    year={year}
                    events={grouped.get(year)!}
                    isCurrent={year === currentYear}
                />
            ))}
        </div>
    );
}
