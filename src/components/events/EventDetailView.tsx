"use client";

import { useTransition } from "react";
import { joinEvent, leaveEvent } from "@/app/(protected)/events/[id]/actions";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Types
type Attendee = {
    id: string; // Member ID for action check
    firstName: string | null;
    lastName: string | null;
    email: string;
};

type PlanItem = {
    id: string;
    time: string;
    title: string;
    description: string | null;
    order: number;
};

type EventDetail = {
    id: string;
    title: string;
    description: string | null;
    startAt: string;
    endAt?: string | null; // Optional end time
    location: string | null;
    address?: string | null;
    totalCost?: number | null;
    clubSubsidy?: number | null;
    coverImage: string | null;
    hasPassed: boolean;
    program?: PlanItem[];
};

type EventDetailViewProps = {
    event: EventDetail;
    attendees: Attendee[];
    currentUserIsAttending: boolean;
    attendeeCount: number;
};

export default function EventDetailView({ event, attendees, currentUserIsAttending, attendeeCount }: EventDetailViewProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const startDate = new Date(event.startAt);
    const dateStr = startDate.toLocaleDateString("no-NO", { day: "numeric", month: "long", year: "numeric" });
    const timeStr = startDate.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });

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

    return (
        <div className="w-full flex-1 bg-white min-h-screen pb-20">
            {/* Back Button */}
            <div className="mb-6">
                <Link
                    href="/events"
                    className="inline-flex items-center text-gray-500 hover:text-gray-900 transition-colors font-medium text-sm"
                >
                    <span className="material-symbols-outlined mr-1 text-[1.2rem]">arrow_back</span>
                    Tilbake til arrangementer
                </Link>
            </div>

            {/* HERO SECTION */}
            <div className="relative h-[400px] w-full bg-black rounded-3xl overflow-hidden">
                {event.coverImage ? (
                    <img
                        src={event.coverImage}
                        alt={event.title}
                        className="w-full h-full object-cover opacity-80"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center text-white/20">
                        <span className="material-symbols-outlined text-6xl">image</span>
                    </div>
                )}

                {/* Overlay Content */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 md:p-12">
                    <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
                        {/* Badges */}
                        <div className="flex items-center gap-2">
                            {event.hasPassed ? (
                                <span className="bg-[#3A3A3A] text-[#C5A66B] px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-[#C5A66B]/20">
                                    • Gjennomført
                                </span>
                            ) : (
                                <span className="bg-[#E8DCC5] text-[#8C7648] px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                                    Påmelding åpen
                                </span>
                            )}
                        </div>

                        {/* Title & Loc */}
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="flex flex-col gap-2">
                                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
                                    {event.title}
                                </h1>
                                {event.location && (
                                    <div className="flex items-center gap-2 text-white/60 text-sm font-medium">
                                        <span className="material-symbols-outlined text-[1.1rem]">location_on</span>
                                        <span>{event.location}</span>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-3">
                                <button className="h-10 px-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-lg flex items-center gap-2 text-white text-xs font-bold transition-all">
                                    <span className="material-symbols-outlined text-[1.1rem]">photo_library</span>
                                    <span>Se alle bilder</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT GRID */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">

                {/* LEFT COLUMN (Main Content) */}
                <div className="lg:col-span-2 flex flex-col gap-12">

                    {/* About Section */}
                    <div className="flex flex-col gap-4">
                        <h2 className="text-xl font-bold text-gray-900">Om kvelden</h2>
                        <div className="prose prose-sm text-gray-500 leading-relaxed max-w-none">
                            <p>{event.description || "Ingen beskrivelse tilgjengelig."}</p>
                            {/* Placeholder text if description is short to match design vibe */}
                            {!event.description && (
                                <>
                                    <p>Årets høydepunkt for klubben ble en uforglemmelig aften på ærverdige Grand Hotel. Vi startet kvelden i Rococo-salen med en eksklusiv aperitiff kl 18:00, ledsaget av levende jazzmusikk.</p>
                                    <p>Middagen bestod av en nøye sammensatt tre-retters meny med tilhørende vinpakke, kuratert av hotellets sommelier. Tradisjonen tro ble det holdt taler fra både formannen og årets nykommere, etterfulgt av utdeling av årets hederspriser.</p>
                                    <p>Takk til alle som bidro til å gjøre kvelden magisk. Vi ser allerede frem til neste år!</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Program Section */}
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#C5A66B]">schedule</span>
                            <h2 className="text-xl font-bold text-gray-900">Program for kvelden</h2>
                        </div>

                        <div className="relative pl-2 border-l border-gray-200 flex flex-col gap-8 ml-2">
                            {event.program && event.program.length > 0 ? (
                                event.program.map((item) => (
                                    <div key={item.id} className="relative pl-6">
                                        <div className="absolute -left-[13px] top-1.5 w-3 h-3 rounded-full border-2 border-[#C5A66B] bg-[#F9F9F7]"></div>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-baseline gap-3">
                                                <span className="text-sm font-bold text-gray-900">{item.time}</span>
                                                <span className="text-base font-bold text-gray-900">-</span>
                                                <span className="text-base font-bold text-gray-900">{item.title}</span>
                                            </div>
                                            {item.description && (
                                                <p className="text-sm text-gray-500 leading-relaxed max-w-md">
                                                    {item.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-400 pl-6">Program kommer snart.</p>
                            )}
                        </div>
                    </div>

                    {/* Gallery Section */}
                    <div className="flex flex-col gap-6 pt-8 border-t border-gray-200/60">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                Bildearkiv
                                <span className="material-symbols-outlined text-gray-400 text-sm">lock</span>
                            </h2>
                            <Link href="/gallery" className="text-[#C5A66B] text-xs font-bold flex items-center gap-1 hover:gap-2 transition-all">
                                <span>Se alle 142 bilder</span>
                                <span className="material-symbols-outlined text-[1rem]">arrow_forward</span>
                            </Link>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="aspect-square bg-gray-200 rounded-lg overflow-hidden relative group">
                                    {/* Placeholder images */}
                                    <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-400 group-hover:scale-105 transition-transform duration-500">
                                        {i === 6 ? (
                                            <div className="flex flex-col items-center">
                                                <span className="text-xl font-bold text-white">+137</span>
                                                <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">Bilder</span>
                                            </div>
                                        ) : (
                                            <span className="material-symbols-outlined">image</span>
                                        )}
                                    </div>
                                    {/* Overlay for last item */}
                                    {i === 6 && <div className="absolute inset-0 bg-black/40"></div>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN (Sidebar) */}
                <div className="flex flex-col gap-6">

                    {/* Details Card */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-6">
                        <h3 className="text-lg font-bold text-gray-900">Detaljer</h3>

                        <div className="flex flex-col gap-5">
                            {/* Date */}
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-lg bg-[#F5F2EA] flex items-center justify-center text-[#C5A66B]">
                                    <span className="material-symbols-outlined">calendar_month</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Dato</span>
                                    <span className="text-sm font-bold text-gray-900">{dateStr}</span>
                                </div>
                            </div>

                            {/* Time */}
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-lg bg-[#F5F2EA] flex items-center justify-center text-[#C5A66B]">
                                    <span className="material-symbols-outlined">schedule</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tid</span>
                                    <span className="text-sm font-bold text-gray-900">{timeStr} - 02:00</span>
                                </div>
                            </div>

                            {/* Location */}
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-lg bg-[#F5F2EA] flex items-center justify-center text-[#C5A66B]">
                                    <span className="material-symbols-outlined">domain</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sted</span>
                                    <span className="text-sm font-bold text-gray-900">{event.location || event.address || "Ikke spesifisert"}</span>
                                    {event.address && <span className="text-xs text-gray-500">{event.address}</span>}
                                </div>
                            </div>
                        </div>

                        {/* Map Placeholder */}
                        <div className="h-32 w-full bg-gray-100 rounded-lg overflow-hidden relative">
                            {event.address || event.location ? (
                                <iframe
                                    width="100%"
                                    height="100%"
                                    frameBorder="0"
                                    scrolling="no"
                                    marginHeight={0}
                                    marginWidth={0}
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(event.address || event.location || "")}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                    className="filter grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-500"
                                ></iframe>
                            ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md text-gray-900">
                                        <span className="material-symbols-outlined text-sm">map</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Economy Card */}
                    {event.totalCost && (
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-6">
                            <h3 className="text-lg font-bold text-gray-900">Kostnad</h3>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-[#F5F2EA] flex items-center justify-center text-[#9A8568]">
                                            <span className="material-symbols-outlined">receipt_long</span>
                                        </div>
                                        <span className="text-sm font-medium text-gray-600">Total kostnad</span>
                                    </div>
                                    <span className="font-bold text-gray-900">{event.totalCost.toLocaleString("nb-NO")},-</span>
                                </div>

                                {event.clubSubsidy && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-[#F5F2EA] flex items-center justify-center text-[#2A9D8F]">
                                                <span className="material-symbols-outlined">loyalty</span>
                                            </div>
                                            <span className="text-sm font-medium text-gray-600">Klubben dekker</span>
                                        </div>
                                        <span className="font-bold text-[#2A9D8F]">- {event.clubSubsidy.toLocaleString("nb-NO")},-</span>
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-base font-bold text-gray-900">Din andel</span>
                                    <span className="text-xl font-bold text-[#C5A66B]">
                                        {((event.totalCost || 0) - (event.clubSubsidy || 0)).toLocaleString("nb-NO")},-
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Attendees Card */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">Deltakere</h3>
                            <span className="px-2 py-0.5 bg-[#F5F2EA] text-[#C5A66B] rounded text-[10px] font-bold">{attendeeCount}</span>
                        </div>

                        {attendees.length > 0 ? (
                            <div className="flex items-center -space-x-3 overflow-hidden py-1">
                                {attendees.slice(0, 5).map((a, i) => (
                                    <div
                                        key={a.id}
                                        className="w-10 h-10 rounded-full bg-gradient-to-br from-[#222] to-[#444] border-2 border-white flex items-center justify-center text-white text-[10px] font-bold ring-1 ring-gray-100"
                                        title={`${a.firstName} ${a.lastName}`}
                                    >
                                        {(a.firstName || a.email).charAt(0).toUpperCase()}
                                    </div>
                                ))}
                                {attendeeCount > 5 && (
                                    <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-gray-500 text-[10px] font-bold ring-1 ring-gray-100">
                                        +{attendeeCount - 5}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400">Ingen deltakere enda.</p>
                        )}

                        <button className="w-full py-2.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                            Se deltakerliste
                        </button>
                    </div>

                    {/* Action Card (Join/Leave) */}
                    {!event.hasPassed && (
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-4">
                            <h3 className="text-lg font-bold text-gray-900">Påmelding</h3>
                            <p className="text-xs text-gray-500">
                                {currentUserIsAttending
                                    ? "Du er påmeldt dette arrangementet."
                                    : "Meld deg på arrangementet her."}
                            </p>

                            <button
                                onClick={handleAttendance}
                                disabled={isPending}
                                className={`w-full py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${currentUserIsAttending
                                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                                    : "bg-gray-900 text-white hover:bg-gray-800 shadow-lg hover:shadow-xl"
                                    }`}
                            >
                                {isPending ? (
                                    <span className="material-symbols-outlined animate-spin text-[1.2rem]">refresh</span>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[1.2rem]">
                                            {currentUserIsAttending ? "remove_circle" : "check_circle"}
                                        </span>
                                        {currentUserIsAttending ? "Meld meg av" : "Meld meg på"}
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                </div>

            </div>
        </div>
    );
}
