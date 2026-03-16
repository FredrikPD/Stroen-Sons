"use client";

import { useTransition, useState } from "react";
import { joinEvent, leaveEvent } from "@/app/(protected)/events/[id]/actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Avatar } from "@/components/Avatar";
import { getCategoryColorClasses } from "@/lib/category-colors";
import AddToCalendarButton from "./AddToCalendarButton";

// Types
type Attendee = {
    id: string; // Member ID for action check
    firstName: string | null;
    lastName: string | null;
    email: string;
    avatarUrl?: string | null;
};

type Photo = {
    id: string;
    url: string;
    caption: string | null;
};

type PlanItem = {
    id: string;
    time: string;
    date?: string | null; // Added date
    title: string;
    description: string | null;
    order: number;
};

type RecapGame = {
    id: string;
    title: string;
    opponent: string | null;
    ourScore: number | null;
    theirScore: number | null;
    result: "WIN" | "DRAW" | "LOSS" | null;
    notes: string | null;
};

type PodiumMember = {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
};

type PodiumEntry = {
    place: number;
    teamName: string | null;
    member: PodiumMember | null;
    teamMembers: PodiumMember[];
};

type RecapPodium = {
    type: "INDIVIDUAL" | "TEAM";
    entries: PodiumEntry[];
};

type EventRecap = {
    id: string;
    status: "DRAFT" | "PUBLISHED";
    summaryPoints: string[];
    story: string | null;
    actionsTaken: string | null;
    highlights: string[];
    lessons: string | null;
    nextTime: string | null;
    publishedAt: string | null;
    updatedAt: string;
    author: {
        firstName: string | null;
        lastName: string | null;
        email: string;
    };
    games: RecapGame[];
    podium?: RecapPodium | null;
};

type EventDetail = {
    id: string;
    title: string;
    description: string | null;
    startAt: string;
    endAt?: string | null; // Optional end time
    registrationDeadline?: string | null;
    maxAttendees?: number | null;
    location: string | null;
    address?: string | null;
    isTba?: boolean;
    totalCost?: number | null;
    clubSubsidy?: number | null;
    coverImage: string | null;
    category: string | null;
    recap?: EventRecap | null;
    hasPassed: boolean;
    program?: PlanItem[];
};

type EventDetailViewProps = {
    event: EventDetail;
    attendees: Attendee[];
    currentUserIsAttending: boolean;

    attendeeCount: number;
    photos: Photo[];
    totalPhotoCount: number;
    categoryColor?: string;
    canEditRecap?: boolean;
};

export default function EventDetailView({ event, attendees, currentUserIsAttending, attendeeCount, photos, totalPhotoCount, categoryColor = "blue", canEditRecap = false }: EventDetailViewProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [showAttendees, setShowAttendees] = useState(false);

    const startDate = new Date(event.startAt);
    const dateStr = startDate.toLocaleDateString("no-NO", { day: "numeric", month: "long", year: "numeric" });
    const timeStr = startDate.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });

    // Format end date if present
    const endDate = event.endAt ? new Date(event.endAt) : null;
    const endDateStr = endDate?.toLocaleDateString("no-NO", { day: "numeric", month: "long", year: "numeric" });
    const endTimeStr = endDate?.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });

    // Format registration deadline
    const regDeadline = event.registrationDeadline ? new Date(event.registrationDeadline) : null;
    const regDeadlineStr = regDeadline?.toLocaleDateString("no-NO", { day: "numeric", month: "long", year: "numeric" });
    const regDeadlineTimeStr = regDeadline?.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });

    // Check if registration is closed
    const isRegistrationClosed = regDeadline ? new Date() > regDeadline : false;
    const visibleRecap = event.recap && (event.recap.status === "PUBLISHED" || canEditRecap) ? event.recap : null;
    const recapAuthorName = visibleRecap
        ? `${visibleRecap.author.firstName || ""} ${visibleRecap.author.lastName || ""}`.trim() || visibleRecap.author.email
        : null;
    const recapUpdatedAt = visibleRecap?.updatedAt
        ? new Date(visibleRecap.updatedAt).toLocaleDateString("no-NO", { day: "numeric", month: "long", year: "numeric" })
        : null;
    const recapLessons = [visibleRecap?.lessons, visibleRecap?.nextTime]
        .filter(Boolean)
        .join("\n\n");

    const formatWinner = (game: RecapGame) => {
        if (!game.result) return null;
        if (game.result === "DRAW") return "Uavgjort";
        if (game.result === "WIN") return game.title;
        return game.opponent || "Lag 2";
    };

    // Handle Join/Leave
    const handleAttendance = () => {
        startTransition(async () => {
            if (currentUserIsAttending) {
                await leaveEvent(event.id);
            } else {
                await joinEvent(event.id);
            }
            router.refresh(); // Refresh to update UI state from server data
        });
    };

    const memberCost = ((event.totalCost || 0) - (event.clubSubsidy || 0));

    return (
        <div className="w-full flex-1 min-h-screen pb-20 flex flex-col gap-8">

            {/* ── HERO ───────────────────────────────────────────────── */}
            <div className="relative w-full h-[300px] sm:h-[360px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                {event.coverImage ? (
                    <img
                        src={event.coverImage}
                        alt={event.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gray-900" />
                )}

                {/* Layered gradients — same pattern as dashboard hero */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/25 to-transparent" />

                <div className="absolute inset-0 p-5 sm:p-7 flex flex-col justify-between text-white">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            {event.hasPassed ? (
                                <span className="bg-white/15 backdrop-blur-md border border-white/20 text-white text-[9px] font-bold px-3 py-1.5 rounded-full uppercase tracking-[0.18em]">
                                    Gjennomført
                                </span>
                            ) : (
                                <span className="bg-white/15 backdrop-blur-md border border-white/20 text-white text-[9px] font-bold px-3 py-1.5 rounded-full uppercase tracking-[0.18em]">
                                    Påmelding åpen
                                </span>
                            )}
                            {event.category && (
                                <span className={`backdrop-blur-md border text-[9px] font-bold px-2.5 py-1.5 rounded-full uppercase tracking-widest ${getCategoryColorClasses(categoryColor).bg} ${getCategoryColorClasses(categoryColor).text} ${getCategoryColorClasses(categoryColor).border}`}>
                                    {event.category}
                                </span>
                            )}
                        </div>

                        {/* Attending status badge */}
                        {currentUserIsAttending && (
                            <span className="flex items-center gap-1.5 text-emerald-100 bg-emerald-500/20 border border-emerald-400/30 text-[9px] font-bold px-3 py-1.5 rounded-full uppercase tracking-[0.18em]">
                                <span className="material-symbols-outlined text-[11px]">task_alt</span>
                                Påmeldt
                            </span>
                        )}
                    </div>

                    {/* Bottom content */}
                    <div className="space-y-3">
                        <h1
                            className="text-2xl sm:text-3xl font-normal leading-tight text-white"
                            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                        >
                            {event.title}
                        </h1>
                        <div className="flex items-center gap-2 flex-wrap">
                            {(event.location || event.isTba) && (
                                <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 min-w-0 shrink overflow-hidden">
                                    <span className="material-symbols-outlined text-[14px] shrink-0 text-white/70">location_on</span>
                                    <span className="font-medium text-[11px] truncate max-w-[150px] sm:max-w-[210px]">
                                        {event.isTba ? "TBA" : event.location}
                                    </span>
                                </div>
                            )}
                            <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 shrink-0">
                                <span className="material-symbols-outlined text-[14px] text-white/70">calendar_today</span>
                                <span className="font-medium text-[11px] whitespace-nowrap">
                                    {startDate.toLocaleDateString("nb-NO", { day: "numeric", month: "long" })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Photo count — bottom right */}
                <Link
                    href={`/gallery/${event.id}`}
                    className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 hover:bg-white/20 transition-colors text-white"
                >
                    <span className="material-symbols-outlined text-[14px] text-white/70">
                        {totalPhotoCount > 0 ? "photo_library" : "add_a_photo"}
                    </span>
                    <span className="font-medium text-[11px] whitespace-nowrap">
                        {totalPhotoCount > 0 ? `${totalPhotoCount} bilder` : "Ingen bilder enda"}
                    </span>
                </Link>
            </div>

            {/* ── TWO-COLUMN GRID ────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">

                {/* ── LEFT COLUMN — main content ─────────────────────── */}
                <div className="lg:col-span-2 space-y-8 min-w-0">

                    {/* Description */}
                    {event.description && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Om arrangementet</span>
                                <div className="flex-1 h-px bg-gray-100" />
                            </div>
                            <div className="prose prose-sm text-gray-600 leading-relaxed max-w-none">
                                <ReactMarkdown>{event.description}</ReactMarkdown>
                            </div>
                        </div>
                    )}

                    {/* Program */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Program</span>
                            <div className="flex-1 h-px bg-gray-100" />
                        </div>

                        {event.program && event.program.length > 0 ? (
                            <div className="relative pl-2 border-l-2 border-gray-100 flex flex-col gap-5 ml-1">
                                {event.program.map((item) => (
                                    <div key={item.id} className="relative pl-5">
                                        <div className="absolute -left-[9px] top-1 w-3 h-3 rounded-full border-2 border-gray-300 bg-white" />
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-baseline gap-2 flex-wrap">
                                                {item.date && (
                                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em]">
                                                        {new Date(item.date).toLocaleDateString("no-NO", { weekday: "short", day: "numeric", month: "short" })}
                                                    </span>
                                                )}
                                                <span className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">{item.time}</span>
                                                <span
                                                    className="text-base font-normal text-gray-900"
                                                    style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                                                >
                                                    {item.title}
                                                </span>
                                            </div>
                                            {item.description && (
                                                <p className="text-sm text-gray-500 leading-relaxed max-w-md mt-0.5">
                                                    {item.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 italic" style={{ fontFamily: "'Georgia', serif" }}>Program kommer snart.</p>
                        )}
                    </div>

                    {/* Recap */}
                    {event.hasPassed && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Etterrapport</span>
                                <div className="flex-1 h-px bg-gray-100" />
                                <div className="flex items-center gap-2">
                                    {visibleRecap?.status === "DRAFT" && (
                                        <span className="text-[9px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border bg-amber-50 text-amber-600 border-amber-200">
                                            Utkast
                                        </span>
                                    )}
                                    {canEditRecap && (
                                        <Link
                                            href={`/admin/events/${event.id}/recap`}
                                            className="text-[10px] font-bold text-gray-400 uppercase tracking-wider hover:text-gray-700 transition-colors"
                                        >
                                            {visibleRecap ? "Rediger" : "Skriv etterrapport"}
                                        </Link>
                                    )}
                                </div>
                            </div>

                            {!visibleRecap ? (
                                <div className="py-10 text-center rounded-2xl border border-dashed border-gray-200">
                                    <p className="text-xs text-gray-400 italic" style={{ fontFamily: "'Georgia', serif" }}>
                                        {canEditRecap
                                            ? "Skriv en oppsummering for å dokumentere hva som skjedde."
                                            : "Ingen etterrapport publisert enda."}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Summary points */}
                                    {visibleRecap.summaryPoints.length > 0 && (
                                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">Kort oppsummert</p>
                                            <ul className="space-y-2">
                                                {visibleRecap.summaryPoints.map((point, index) => (
                                                    <li key={`${point}-${index}`} className="flex items-start gap-2.5 text-sm text-gray-700">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 shrink-0" />
                                                        {point}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Story */}
                                    {visibleRecap.story && (
                                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">Hva skjedde</p>
                                            <div className="prose prose-sm text-gray-600 max-w-none">
                                                <ReactMarkdown>{visibleRecap.story}</ReactMarkdown>
                                            </div>
                                        </div>
                                    )}

                                    {/* Games */}
                                    {visibleRecap.games.length > 0 && (
                                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                            <div className="px-5 py-3 border-b border-gray-100">
                                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Kamper</p>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b border-gray-100 bg-gray-50/60">
                                                            <th className="text-left px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.15em] text-gray-400">Type</th>
                                                            <th className="text-left px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.15em] text-gray-400">Lag 1</th>
                                                            <th className="text-left px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.15em] text-gray-400">Lag 2</th>
                                                            <th className="text-left px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.15em] text-gray-400">Score</th>
                                                            <th className="text-left px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.15em] text-gray-400">Vinner</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {visibleRecap.games.map((game) => (
                                                            <tr key={game.id} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                                                                <td className="px-5 py-3 text-xs text-gray-500">{game.notes || "—"}</td>
                                                                <td className="px-5 py-3 text-xs font-bold text-gray-900">{game.title}</td>
                                                                <td className="px-5 py-3 text-xs text-gray-600">{game.opponent || "—"}</td>
                                                                <td className="px-5 py-3 text-xs font-mono text-gray-700">
                                                                    {game.ourScore !== null && game.theirScore !== null
                                                                        ? `${game.ourScore} – ${game.theirScore}`
                                                                        : "—"}
                                                                </td>
                                                                <td className="px-5 py-3">
                                                                    {game.result ? (
                                                                        <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                                                                            game.result === "WIN"
                                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                                : game.result === "LOSS"
                                                                                    ? "bg-red-50 text-red-600 border-red-200"
                                                                                    : "bg-gray-100 text-gray-500 border-gray-200"
                                                                        }`}>
                                                                            {formatWinner(game) || "—"}
                                                                        </span>
                                                                    ) : "—"}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Podium */}
                                    {visibleRecap.podium && visibleRecap.podium.entries.length > 0 && (
                                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                            <div className="px-5 py-3 border-b border-gray-100">
                                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Podium</p>
                                            </div>
                                            <div className="p-4 flex flex-col gap-2">
                                                {visibleRecap.podium.entries.map((entry) => {
                                                    const medal = entry.place === 1 ? "🥇" : entry.place === 2 ? "🥈" : entry.place === 3 ? "🥉" : null;
                                                    const placeLabel = entry.place === 1 ? "Vinner" : `${entry.place}. plass`;
                                                    const rowBg = entry.place === 1
                                                        ? "bg-amber-50/60 border border-amber-100"
                                                        : entry.place === 2
                                                            ? "bg-gray-50/80 border border-gray-100"
                                                            : "bg-orange-50/40 border border-orange-100/60";

                                                    return (
                                                        <div key={entry.place} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${rowBg}`}>
                                                            <span className="text-xl shrink-0">{medal || `${entry.place}.`}</span>

                                                            {visibleRecap.podium!.type === "INDIVIDUAL" && entry.member ? (
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    <Avatar
                                                                        src={entry.member.avatarUrl}
                                                                        initials={`${entry.member.firstName?.[0] || ""}${entry.member.lastName?.[0] || ""}`}
                                                                        size="sm"
                                                                    />
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span
                                                                            className="text-sm font-normal text-gray-900 leading-snug"
                                                                            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                                                                        >
                                                                            {entry.member.firstName} {entry.member.lastName}
                                                                        </span>
                                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em]">
                                                                            {placeLabel}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col gap-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span
                                                                            className="text-sm font-normal text-gray-900"
                                                                            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                                                                        >
                                                                            {entry.teamName}
                                                                        </span>
                                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em]">
                                                                            {placeLabel}
                                                                        </span>
                                                                    </div>
                                                                    {entry.teamMembers.length > 0 && (
                                                                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                                                                            {entry.teamMembers.map((m) => (
                                                                                <div key={m.id} className="flex items-center gap-1.5">
                                                                                    <Avatar
                                                                                        src={m.avatarUrl}
                                                                                        initials={`${m.firstName?.[0] || ""}${m.lastName?.[0] || ""}`}
                                                                                        size="xs"
                                                                                    />
                                                                                    <span className="text-xs text-gray-600">
                                                                                        {m.firstName} {m.lastName}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Lessons */}
                                    {recapLessons && (
                                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">Lærdom og neste gang</p>
                                            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{recapLessons}</p>
                                        </div>
                                    )}

                                    <p className="text-[10px] text-gray-400 pt-1">
                                        Skrevet av {recapAuthorName}{recapUpdatedAt ? ` · Oppdatert ${recapUpdatedAt}` : ""}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Photos grid */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Bilder</span>
                            <div className="flex-1 h-px bg-gray-100" />
                            <Link href={`/gallery/${event.id}`} className="text-[10px] font-bold text-gray-400 uppercase tracking-wider hover:text-gray-700 transition-colors">Se alle</Link>
                        </div>
                        {photos && photos.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                                {photos.slice(0, 6).map((photo, i) => (
                                    <Link href={`/gallery/${event.id}`} key={photo.id} className="aspect-square rounded-xl overflow-hidden relative group cursor-pointer bg-gray-100">
                                        <img src={photo.url} alt={photo.caption || ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        {i === 5 && totalPhotoCount > 6 ? (
                                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-[2px]">
                                                <span className="text-lg font-normal text-white" style={{ fontFamily: "'Georgia', serif" }}>+{totalPhotoCount - 5}</span>
                                                <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest">bilder</span>
                                            </div>
                                        ) : (
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                        )}
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center rounded-xl border border-dashed border-gray-200">
                                <span className="material-symbols-outlined text-gray-300 text-2xl block mb-1">photo_library</span>
                                <p className="text-xs text-gray-400 italic" style={{ fontFamily: "'Georgia', serif" }}>Ingen bilder enda.</p>
                            </div>
                        )}
                    </div>

                </div>

                {/* ── RIGHT COLUMN — sidebar ──────────────────────────── */}
                <div className="space-y-5 min-w-0">

                    {/* Dark details card — mirrors dashboard membership card */}
                    <div
                        className="rounded-2xl p-5 flex flex-col gap-5"
                        style={{ background: "linear-gradient(180deg, #2a2a2a 0%, #222222 100%)", boxShadow: "0 2px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.05)" }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">Detaljer</span>
                        </div>

                        <div className="h-px bg-white/8" />

                        <div className="space-y-4">
                            {/* Start */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Start</p>
                                    <p
                                        className="font-normal text-gray-100 text-sm leading-snug"
                                        style={{ fontFamily: "'Georgia', serif" }}
                                    >
                                        {dateStr}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{timeStr}</p>
                                </div>
                                <span className="material-symbols-outlined text-lg text-gray-500">calendar_today</span>
                            </div>

                            {/* End */}
                            {endTimeStr && (
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Slutt</p>
                                        <p
                                            className="font-normal text-gray-100 text-sm leading-snug"
                                            style={{ fontFamily: "'Georgia', serif" }}
                                        >
                                            {endDateStr !== dateStr ? endDateStr : endTimeStr}
                                        </p>
                                        {endDateStr !== dateStr && (
                                            <p className="text-[10px] text-gray-400 mt-0.5">{endTimeStr}</p>
                                        )}
                                    </div>
                                    <span className="material-symbols-outlined text-lg text-gray-500">schedule</span>
                                </div>
                            )}

                            {/* Deadline */}
                            {regDeadlineStr && (
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Påmeldingsfrist</p>
                                        <p
                                            className="font-normal text-gray-100 text-sm leading-snug"
                                            style={{ fontFamily: "'Georgia', serif" }}
                                        >
                                            {regDeadlineStr}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">kl {regDeadlineTimeStr}</p>
                                    </div>
                                    <span className="material-symbols-outlined text-lg text-gray-500">event_busy</span>
                                </div>
                            )}

                            {/* Location */}
                            {(event.location || event.address || event.isTba) && (
                                <div className="flex items-center justify-between">
                                    <div className="min-w-0 pr-3">
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Sted</p>
                                        <p
                                            className="font-normal text-gray-100 text-sm leading-snug truncate"
                                            style={{ fontFamily: "'Georgia', serif" }}
                                        >
                                            {event.isTba ? "TBA" : (event.location || event.address)}
                                        </p>
                                        {event.address && !event.isTba && (
                                            <p className="text-[10px] text-gray-400 mt-0.5 truncate">{event.address}</p>
                                        )}
                                        {event.isTba && (
                                            <p className="text-[10px] text-gray-500 mt-0.5">Sted kommer senere</p>
                                        )}
                                    </div>
                                    <span className="material-symbols-outlined text-lg text-gray-500 shrink-0">domain</span>
                                </div>
                            )}

                            {/* Cost */}
                            {event.totalCost && (
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Din andel</p>
                                        <p
                                            className="font-normal text-gray-100 leading-none"
                                            style={{ fontFamily: "'Georgia', serif", fontSize: "1.25rem" }}
                                        >
                                            {memberCost.toLocaleString("nb-NO")},–
                                        </p>
                                        {event.clubSubsidy ? (
                                            <p className="text-[10px] text-gray-500 mt-0.5">
                                                Totalt {event.totalCost.toLocaleString("nb-NO")},– · Klubben dekker {event.clubSubsidy.toLocaleString("nb-NO")},–
                                            </p>
                                        ) : null}
                                    </div>
                                    <span className="material-symbols-outlined text-lg text-gray-500">receipt_long</span>
                                </div>
                            )}
                        </div>

                        {/* Map */}
                        {event.address && !event.isTba && (
                            <>
                                <div className="h-px bg-white/8" />
                                <div className="h-28 w-full rounded-xl overflow-hidden">
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        src={`https://maps.google.com/maps?q=${encodeURIComponent(event.address || "")}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                        className="filter grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-500"
                                    />
                                </div>
                            </>
                        )}

                        <div className="h-px bg-white/8" />
                        <AddToCalendarButton event={event} />
                    </div>

                    {/* Join / Leave card */}
                    {!event.hasPassed && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Påmelding</span>
                                <div className="flex-1 h-px bg-gray-100" />
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                {currentUserIsAttending
                                    ? "Du er påmeldt dette arrangementet."
                                    : (isRegistrationClosed
                                        ? "Påmeldingsfristen er over."
                                        : "Meld deg på arrangementet her.")}
                            </p>
                            <button
                                onClick={handleAttendance}
                                disabled={isPending || (!currentUserIsAttending && isRegistrationClosed)}
                                className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                    currentUserIsAttending
                                        ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
                                        : (!currentUserIsAttending && isRegistrationClosed)
                                            ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                                            : "bg-gray-900 text-white hover:bg-gray-800 shadow-sm hover:shadow-md"
                                }`}
                            >
                                {isPending ? (
                                    <span className="w-5 h-5 border-2 border-gray-400/25 border-t-gray-400 rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[1.1rem]">
                                            {currentUserIsAttending ? "remove_circle" : (isRegistrationClosed ? "block" : "check_circle")}
                                        </span>
                                        {currentUserIsAttending ? "Meld meg av" : (isRegistrationClosed ? "Påmelding stengt" : "Meld meg på")}
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Attendees card */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100">
                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Deltakere</span>
                            <div className="flex-1 h-px bg-gray-100" />
                            <span className="text-[9px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border bg-gray-50 text-gray-500 border-gray-200">
                                {attendeeCount}{event.maxAttendees ? ` / ${event.maxAttendees}` : ""}
                            </span>
                        </div>
                        <div className="px-4 py-4 flex flex-col gap-3">
                            {attendees.length > 0 ? (
                                <div className="flex items-center -space-x-2.5 overflow-hidden py-0.5">
                                    {attendees.slice(0, 7).map((a) => (
                                        <Avatar
                                            key={a.id}
                                            src={a.avatarUrl ?? null}
                                            initials={a.firstName && a.lastName ? `${a.firstName[0]}${a.lastName[0]}`.toUpperCase() : (a.firstName || a.email).substring(0, 2).toUpperCase()}
                                            alt={`${a.firstName || ""} ${a.lastName || ""}`}
                                            className="w-9 h-9 border-2 border-white ring-1 ring-gray-100"
                                        />
                                    ))}
                                    {attendeeCount > 7 && (
                                        <div className="w-9 h-9 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-gray-500 text-[9px] font-bold ring-1 ring-gray-100">
                                            +{attendeeCount - 7}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 italic" style={{ fontFamily: "'Georgia', serif" }}>Ingen deltakere enda.</p>
                            )}
                            <button
                                onClick={() => setShowAttendees(true)}
                                className="w-full py-2 border border-gray-200 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                                Se deltakerliste
                            </button>
                        </div>
                    </div>


                </div>
            </div>

            {/* ── ATTENDEE MODAL ─────────────────────────────────────── */}
            {showAttendees && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setShowAttendees(false)}
                    />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Deltakere</span>
                                <span className="text-[9px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border bg-gray-50 text-gray-500 border-gray-200">
                                    {attendees.length}
                                </span>
                            </div>
                            <button
                                onClick={() => setShowAttendees(false)}
                                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                            >
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>
                        <div className="overflow-y-auto p-3 scrollbar-hide">
                            {attendees.length > 0 ? (
                                <div className="flex flex-col gap-0.5">
                                    {attendees.map((attendee) => (
                                        <div key={attendee.id} className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-xl transition-colors">
                                            <Avatar
                                                src={attendee.avatarUrl ?? null}
                                                initials={attendee.firstName && attendee.lastName ? `${attendee.firstName[0]}${attendee.lastName[0]}`.toUpperCase() : (attendee.firstName || attendee.email).substring(0, 2).toUpperCase()}
                                                alt={`${attendee.firstName || ""} ${attendee.lastName || ""}`}
                                                className="w-8 h-8 flex-shrink-0 text-[10px]"
                                            />
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-bold text-gray-900 truncate">
                                                    {attendee.firstName ? `${attendee.firstName} ${attendee.lastName || ""}` : "Anonym"}
                                                </span>
                                                <span className="text-[10px] text-gray-400 truncate">{attendee.email}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-10 text-center text-gray-400 text-xs italic" style={{ fontFamily: "'Georgia', serif" }}>
                                    Ingen deltakere enda.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
