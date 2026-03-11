import { ensureMember } from "@/server/auth/ensureMember";
import { db } from "@/server/db";
import { Avatar } from "@/components/Avatar";
import Link from "next/link";
import { Prisma } from "@prisma/client";

export const metadata = {
    title: "Scoreboard",
};

/* ── Color maps ────────────────────────────────────────────── */

const placeStyles: Record<number, { badge: string; border: string; accentBorder: string; label: string }> = {
    1: {
        badge: "bg-[#F5C518] text-[#7a5c00]",
        border: "border-yellow-200",
        accentBorder: "border-l-[#F5C518]",
        label: "Vinner",
    },
    2: {
        badge: "bg-[#C0C0C0] text-[#4a4a4a]",
        border: "border-gray-300",
        accentBorder: "border-l-[#C0C0C0]",
        label: "2. plass",
    },
    3: {
        badge: "bg-[#CD7F32] text-white",
        border: "border-orange-200",
        accentBorder: "border-l-[#CD7F32]",
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
    const MAX_SHOWN = 5;
    const shown = members.slice(0, MAX_SHOWN);
    const overflow = members.length - MAX_SHOWN;

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center -space-x-1.5">
                {shown.map((m) => (
                    <Avatar
                        key={m.name}
                        src={m.avatarUrl ?? null}
                        initials={m.name.substring(0, 2)}
                        alt={m.name}
                        size="xs"
                        className="ring-2 ring-white"
                    />
                ))}
                {overflow > 0 && (
                    <span className="flex items-center justify-center size-5 rounded-full bg-gray-100 text-[9px] font-bold text-gray-500 ring-2 ring-white">
                        +{overflow}
                    </span>
                )}
            </div>
            <p className="text-[11px] text-gray-500 leading-tight">
                {shown.map((m) => m.name.split(" ")[0]).join(", ")}
                {overflow > 0 && ` +${overflow}`}
            </p>
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
        <div className="flex items-center gap-0 flex-1">
            <div className={`flex items-center justify-center size-12 shrink-0 rounded-lg border-l-5 ${style.accentBorder} text-lg font-bold text-gray-800`}>
                {entry.place}
            </div>
            <Avatar
                src={entry.avatarUrl ?? null}
                initials={entry.name.substring(0, 2)}
                alt={entry.name}
                size="sm"
                className="shrink-0"
            />
            <span className="text-sm font-bold text-gray-900 pl-3">{entry.name}</span>
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
        teamMembers: { memberId: string; firstName: string | null; lastName: string | null; avatarUrl: string | null }[];
    }[];
};

type ScoreboardEvent = Prisma.EventGetPayload<{
    include: {
        recap: {
            include: {
                podium: {
                    include: {
                        entries: {
                            include: {
                                member: {
                                    select: {
                                        firstName: true;
                                        lastName: true;
                                        avatarUrl: true;
                                    };
                                };
                                teamMembers: {
                                    include: {
                                        member: {
                                            select: {
                                                firstName: true;
                                                lastName: true;
                                                avatarUrl: true;
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
    };
}>;

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
                <div className="p-5 lg:w-1/4 flex flex-col gap-2 justify-center">
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
                <div className="flex-1 p-5 flex flex-col sm:flex-row gap-3 items-stretch border-t lg:border-t-0 lg:border-l border-gray-100">
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

/* ── Hall of Fame ──────────────────────────────────────────── */

type MemberMedalTally = {
    memberId: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    gold: number;
    silver: number;
    bronze: number;
    total: number;
};

type HallOfFamePlace = {
    place: number;
    members: MemberMedalTally[];
};

function computeHallOfFame(events: EventWithPodium[]): HallOfFamePlace[] {
    const tallyMap = new Map<string, MemberMedalTally>();

    function creditMember(
        memberId: string,
        firstName: string | null,
        lastName: string | null,
        avatarUrl: string | null,
        place: number
    ) {
        if (!memberId) return;
        let tally = tallyMap.get(memberId);
        if (!tally) {
            tally = {
                memberId,
                firstName: firstName || "",
                lastName: lastName || "",
                avatarUrl,
                gold: 0,
                silver: 0,
                bronze: 0,
                total: 0,
            };
            tallyMap.set(memberId, tally);
        }
        // Update name/avatar if we get a non-empty value
        if (firstName) tally.firstName = firstName;
        if (lastName) tally.lastName = lastName;
        if (avatarUrl) tally.avatarUrl = avatarUrl;

        if (place === 1) tally.gold++;
        else if (place === 2) tally.silver++;
        else if (place === 3) tally.bronze++;
        tally.total++;
    }

    for (const event of events) {
        for (const entry of event.entries) {
            if (entry.place < 1 || entry.place > 3) continue;

            if (event.podiumType === "INDIVIDUAL" && entry.memberId) {
                creditMember(entry.memberId, entry.memberFirstName, entry.memberLastName, entry.memberAvatarUrl, entry.place);
            } else if (event.podiumType === "TEAM") {
                for (const tm of entry.teamMembers) {
                    creditMember(tm.memberId, tm.firstName, tm.lastName, tm.avatarUrl, entry.place);
                }
            }
        }
    }

    const sorted = [...tallyMap.values()].sort((a, b) => {
        if (b.gold !== a.gold) return b.gold - a.gold;
        if (b.silver !== a.silver) return b.silver - a.silver;
        return b.bronze - a.bronze;
    });

    if (sorted.length === 0) return [];

    // Assign places with ties
    const places: HallOfFamePlace[] = [];
    let currentPlace = 1;

    for (let i = 0; i < sorted.length; i++) {
        const member = sorted[i];
        if (i > 0) {
            const prev = sorted[i - 1];
            if (member.gold !== prev.gold || member.silver !== prev.silver || member.bronze !== prev.bronze) {
                currentPlace++;
            }
        }
        if (currentPlace > 3) break;

        let placeGroup = places.find((p) => p.place === currentPlace);
        if (!placeGroup) {
            placeGroup = { place: currentPlace, members: [] };
            places.push(placeGroup);
        }
        placeGroup.members.push(member);
    }

    return places;
}

function formatHallOfFameNames(members: MemberMedalTally[]): string {
    const names = members.map((m) => (m.firstName || m.lastName || "?").split(" ")[0]);
    if (names.length <= 1) return names[0] || "";
    if (names.length === 2) return `${names[0]} & ${names[1]}`;
    return names.slice(0, -1).join(", ") + " & " + names[names.length - 1];
}

const podiumConfig: Record<number, { bg: string; border: string; textColor: string; trophyColor: string; height: string; placeLabel: string; ringColor: string; avatarSize: "md" | "lg" }> = {
    1: {
        bg: "bg-gradient-to-t from-yellow-200 via-yellow-100 to-yellow-50",
        border: "border-[#F5C518]",
        textColor: "text-yellow-700",
        trophyColor: "text-[#F5C518]",
        height: "min-h-[140px] sm:min-h-[160px]",
        placeLabel: "1st",
        ringColor: "ring-yellow-400",
        avatarSize: "lg",
    },
    2: {
        bg: "bg-gradient-to-t from-slate-200 via-slate-100 to-slate-50",
        border: "border-slate-400",
        textColor: "text-slate-600",
        trophyColor: "text-slate-400",
        height: "min-h-[110px] sm:min-h-[130px]",
        placeLabel: "2nd",
        ringColor: "ring-slate-300",
        avatarSize: "md",
    },
    3: {
        bg: "bg-gradient-to-t from-orange-200 via-orange-100 to-orange-50",
        border: "border-[#CD7F32]",
        textColor: "text-[#8B5E14]",
        trophyColor: "text-[#CD7F32]",
        height: "min-h-[50px] sm:min-h-[80px]",
        placeLabel: "3rd",
        ringColor: "ring-orange-300",
        avatarSize: "md",
    },
};

function PodiumColumn({ placeData }: { placeData: HallOfFamePlace }) {
    const config = podiumConfig[placeData.place];
    const isFirst = placeData.place === 1;

    return (
        <div className={`flex flex-col items-center ${isFirst ? "order-2" : placeData.place === 2 ? "order-1" : "order-3"}`} style={{ flex: 1 }}>
            {/* Avatars */}
            <div className="flex items-center justify-center -space-x-2 mb-2">
                {placeData.members.map((m) => (
                    <Avatar
                        key={m.memberId}
                        src={m.avatarUrl}
                        initials={`${m.firstName?.[0] || ""}${m.lastName?.[0] || ""}`}
                        alt={`${m.firstName} ${m.lastName}`}
                        size={config.avatarSize}
                        className={`ring-2 ${config.ringColor}`}
                    />
                ))}
            </div>

            {/* Names */}
            <p className="text-xs font-bold text-gray-900 text-center mb-0.5 max-w-[160px]">
                {formatHallOfFameNames(placeData.members)}
            </p>

            {/* Medal tally */}
            <div className={`flex items-center gap-1.5 font-bold ${config.textColor} mb-2 text-sm`}>
                {placeData.members[0].gold > 0 && <span>🥇{placeData.members[0].gold}</span>}
                {placeData.members[0].silver > 0 && <span>🥈{placeData.members[0].silver}</span>}
                {placeData.members[0].bronze > 0 && <span>🥉{placeData.members[0].bronze}</span>}
            </div>

            {/* Podium block */}
            <div
                className={`w-full ${config.height} ${config.bg} border-t-2 ${config.border} rounded-t-lg flex flex-col items-center justify-center gap-1`}
            >
                <span className={`material-symbols-outlined ${config.trophyColor} ${isFirst ? "text-3xl" : "text-2xl"}`}>
                    emoji_events
                </span>
                <span className={`font-black ${config.textColor} ${isFirst ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"}`}>
                    {config.placeLabel}
                </span>
            </div>
        </div>
    );
}

function HallOfFame({ places }: { places: HallOfFamePlace[] }) {
    if (places.length === 0) return null;

    return (
        <section className="overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-4">
                <h2 className="text-xl sm:text-2xl font-bold text-[#0d1419]">
                    Wall of <span className="italic text-green-600">Fame</span>
                </h2>
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 shrink-0">
                    All-Time
                </span>
            </div>

            {/* Podium */}
            <div className="flex items-end gap-2 sm:gap-3 max-w-2xl mx-auto mt-6 mb-8">
                {[2, 1, 3].map((place) => {
                    const placeData = places.find((p) => p.place === place);
                    if (!placeData) return <div key={place} className={`${place === 1 ? "order-2" : place === 2 ? "order-1" : "order-3"}`} style={{ flex: 1 }} />;
                    return <PodiumColumn key={place} placeData={placeData} />;
                })}
            </div>
        </section>
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
    }) as ScoreboardEvent[];

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
                    memberId: tm.memberId,
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

    // Compute all-time hall of fame
    const hallOfFamePlaces = computeHallOfFame(eventsWithPodium);

    return (
        <div className="space-y-6">

            {/* All-Time Hall of Fame — only when viewing all years */}
            {!selectedYear && hallOfFamePlaces.length > 0 && (
                <HallOfFame places={hallOfFamePlaces} />
            )}

            {allYears.length === 0 && (
                <p className="text-gray-400 text-sm">Ingen arrangementer med podium ennå.</p>
            )}

            {allYears.length > 0 && (
                    <YearFilter years={allYears} selected={selectedYear} />
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
