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
    const medals: Record<number, string> = { 1: "#F5C518", 2: "#C0C0C0", 3: "#CD7F32" };
    const color = medals[entry.place] || "#9ca3af";
    return (
        <div
            className="flex flex-col gap-2 rounded-xl bg-white p-4 min-w-[140px] flex-1 border border-gray-200 shadow-sm"
            style={{ borderTopColor: color, borderTopWidth: "3px" }}
        >
            <div className="flex items-center gap-2">
                <PlaceBadge place={entry.place} />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {placeStyles[entry.place]?.label}
                </span>
            </div>
            <p className="text-sm font-bold text-gray-900">{entry.teamName}</p>
            <MemberList members={entry.members} />
        </div>
    );
}

function IndividualResultCard({ entry }: { entry: IndividualEntry }) {
    const medals: Record<number, string> = { 1: "#F5C518", 2: "#C0C0C0", 3: "#CD7F32" };
    const color = medals[entry.place] || "#9ca3af";
    return (
        <div className="flex items-center gap-3 flex-1 rounded-xl bg-white border border-gray-200 shadow-sm px-4 py-3" style={{ borderLeftColor: color, borderLeftWidth: "3px" }}>
            <div
                className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg text-sm font-black"
                style={{ background: color, color: entry.place === 1 ? "#7a5c00" : entry.place === 2 ? "#4a4a4a" : "#fff" }}
            >
                {entry.place}
            </div>
            <Avatar
                src={entry.avatarUrl ?? null}
                initials={entry.name.substring(0, 2)}
                alt={entry.name}
                size="sm"
                className="shrink-0"
            />
            <span className="text-sm font-bold text-gray-900">{entry.name}</span>
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
        <div className="group bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm transition-shadow hover:shadow-md">
            <div className="flex flex-col lg:flex-row">
                {/* Left: event info */}
                <div className="p-5 lg:w-56 flex flex-col gap-2 justify-center border-b lg:border-b-0 lg:border-r border-gray-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#BFA181]">{dateStr}</p>
                    <h3 className="text-base font-bold text-gray-900 leading-tight">{event.title}</h3>
                    <Link
                        href={`/events/${event.id}`}
                        className="text-xs font-semibold text-gray-400 hover:text-[#BFA181] transition-colors mt-0.5 inline-flex items-center gap-1"
                    >
                        Se arrangement
                        <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                    </Link>
                </div>

                {/* Right: results */}
                <div className="flex-1 p-5 flex flex-col sm:flex-row gap-3 items-stretch">
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
        <section className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#BFA181]">
                    {isCurrent ? "Nåværende sesong" : "Sesong"}
                </span>
                <h2 className="text-2xl font-black text-[#0d1419]">{year}</h2>
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-300">{events.length} {events.length === 1 ? "arrangement" : "arrangementer"}</span>
            </div>
            <div className="flex flex-col gap-3">
                {events.map((event) => (
                    <EventCard key={event.id} event={event} />
                ))}
            </div>
        </section>
    );
}

function YearFilter({ years, selected }: { years: number[]; selected: number | null }) {
    return (
        <div className="flex items-center gap-1 border-b border-gray-100 pb-0 overflow-x-auto">
            <Link
                href="/scoreboard"
                className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider shrink-0 border-b-2 transition-colors ${
                    !selected
                        ? "border-[#0d1419] text-[#0d1419]"
                        : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
            >
                Alle år
            </Link>
            {years.map((year) => (
                <Link
                    key={year}
                    href={`/scoreboard?year=${year}`}
                    className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider shrink-0 border-b-2 transition-colors ${
                        selected === year
                            ? "border-[#BFA181] text-[#0d1419]"
                            : "border-transparent text-gray-400 hover:text-gray-600"
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
    const firstName = (m: MemberMedalTally) => (m.firstName || m.lastName || "?").split(" ")[0];
    const fullName = (m: MemberMedalTally) => [m.firstName, m.lastName].filter(Boolean).join(" ") || "?";
    const names = members.map(members.length === 1 ? fullName : firstName);
    if (names.length <= 1) return names[0] || "";
    if (names.length === 2) return `${names[0]} & ${names[1]}`;
    return names.slice(0, -1).join(", ") + " & " + names[names.length - 1];
}

const hofConfig: Record<number, {
    columnBg: string;
    capBg: string;
    capText: string;
    ringClass: string;
    heightClass: string;
    placeNumeral: string;
    avatarSize: "md" | "lg";
    order: string;
    medalColor: string;
}> = {
    1: {
        columnBg: "bg-[#1a1814]",
        capBg: "bg-[#F5C518]",
        capText: "text-[#7a5c00]",
        ringClass: "ring-[#F5C518]",
        heightClass: "h-36 sm:h-44",
        placeNumeral: "I",
        avatarSize: "lg",
        order: "order-2",
        medalColor: "#F5C518",
    },
    2: {
        columnBg: "bg-[#232220]",
        capBg: "bg-[#C0C0C0]",
        capText: "text-[#4a4a4a]",
        ringClass: "ring-[#C0C0C0]",
        heightClass: "h-24 sm:h-32",
        placeNumeral: "II",
        avatarSize: "md",
        order: "order-1",
        medalColor: "#C0C0C0",
    },
    3: {
        columnBg: "bg-[#201e1b]",
        capBg: "bg-[#CD7F32]",
        capText: "text-white",
        ringClass: "ring-[#CD7F32]",
        heightClass: "h-14 sm:h-20",
        placeNumeral: "III",
        avatarSize: "md",
        order: "order-3",
        medalColor: "#CD7F32",
    },
};

function PodiumColumn({ placeData }: { placeData: HallOfFamePlace }) {
    const cfg = hofConfig[placeData.place];
    const isFirst = placeData.place === 1;

    return (
        <div className={`flex flex-col items-center ${cfg.order} flex-1`}>
            {/* Floating avatars */}
            <div className="flex items-center justify-center -space-x-2 mb-2">
                {placeData.members.map((m) => (
                    <Avatar
                        key={m.memberId}
                        src={m.avatarUrl}
                        initials={`${m.firstName?.[0] || ""}${m.lastName?.[0] || ""}`}
                        alt={`${m.firstName} ${m.lastName}`}
                        size={cfg.avatarSize}
                        className={`ring-2 ${cfg.ringClass}`}
                    />
                ))}
            </div>

            {/* Name */}
            <p className={`font-bold text-center mb-1 max-w-[130px] leading-tight ${isFirst ? "text-white text-sm" : "text-gray-300 text-xs"}`}>
                {formatHallOfFameNames(placeData.members)}
            </p>

            {/* Medal tally */}
            <div className="flex items-center gap-1.5 mb-2 text-xs font-bold">
                {placeData.members[0].gold > 0 && (
                    <span style={{ color: "#F5C518" }}>🥇{placeData.members[0].gold}</span>
                )}
                {placeData.members[0].silver > 0 && (
                    <span style={{ color: "#C0C0C0" }}>🥈{placeData.members[0].silver}</span>
                )}
                {placeData.members[0].bronze > 0 && (
                    <span style={{ color: "#CD7F32" }}>🥉{placeData.members[0].bronze}</span>
                )}
            </div>

            {/* Column */}
            <div className={`w-full ${cfg.heightClass} ${cfg.columnBg} flex flex-col items-center justify-end pb-4 rounded-t-lg relative overflow-hidden`}>
                {/* Subtle top cap line */}
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: cfg.medalColor, opacity: 0.8 }} />
                <span
                    className={`font-black tracking-tight ${isFirst ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl"}`}
                    style={{ color: cfg.medalColor, opacity: 0.9 }}
                >
                    {cfg.placeNumeral}
                </span>
            </div>
        </div>
    );
}

function HallOfFame({ places }: { places: HallOfFamePlace[] }) {
    if (places.length === 0) return null;

    return (
        <section className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(160deg, #1a1814 0%, #0f0e0c 100%)" }}>
            {/* Header bar */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-0">
                <span className="material-symbols-outlined text-[#F5C518] text-xl">emoji_events</span>
                <h2 className="text-base font-black tracking-widest uppercase text-white">
                    Wall of Fame
                </h2>
                <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, #BFA18133 0%, transparent 100%)" }} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    All-Time
                </span>
            </div>

            {/* Podium stage */}
            <div className="px-4 sm:px-8 pt-6 pb-0">
                <div className="flex items-end gap-3 sm:gap-4 w-full max-w-2xl mx-auto">
                    {[2, 1, 3].map((place) => {
                        const placeData = places.find((p) => p.place === place);
                        if (!placeData) {
                            const cfg = hofConfig[place];
                            return (
                                <div
                                    key={place}
                                    className={`${cfg.order} ${cfg.heightClass} ${cfg.columnBg} rounded-t-lg flex-1 opacity-20`}
                                />
                            );
                        }
                        return <PodiumColumn key={place} placeData={placeData} />;
                    })}
                </div>
            </div>

            {/* Stage floor */}
            <div className="h-3 mx-0" style={{ background: "linear-gradient(90deg, #2c2a26 0%, #3a3630 50%, #2c2a26 100%)" }} />
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
            <div className="space-y-8">
                {visibleYears.map((year) => (
                    <SeasonSection
                        key={year}
                        year={year}
                        events={grouped.get(year)!}
                        isCurrent={year === currentYear}
                    />
                ))}
            </div>
        </div>
    );
}
