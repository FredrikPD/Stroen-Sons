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
};

export default function EventDetailView({ event, attendees, currentUserIsAttending, attendeeCount, photos, totalPhotoCount, categoryColor = "blue" }: EventDetailViewProps) {
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
                        <span className="material-symbols-outlined text-5xl">image</span>
                    </div>
                )}

                {/* Overlay Content */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 md:p-10">
                    <div className="max-w-7xl mx-auto w-full flex flex-col gap-4">
                        {/* Badges */}
                        <div className="flex items-center gap-2">
                            {event.hasPassed ? (
                                <span className="bg-emerald-500/90 text-white px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm">
                                    ✓ Gjennomført
                                </span>
                            ) : (
                                <span className="bg-[#EEF2FF] text-[#4F46E5] px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                                    Påmelding åpen
                                </span>
                            )}

                            {/* Category Badge */}
                            {event.category && (
                                <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm border ${getCategoryColorClasses(categoryColor).bg} ${getCategoryColorClasses(categoryColor).text} ${getCategoryColorClasses(categoryColor).border}`}>
                                    {event.category}
                                </span>
                            )}
                        </div>

                        {/* Title & Loc */}
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div className="flex flex-col gap-1.5">
                                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
                                    {event.title}
                                </h1>
                                <div className="flex items-center gap-1.5 text-white/70 text-sm font-medium">
                                    <span className="material-symbols-outlined text-base">location_on</span>
                                    <span>{event.isTba ? "TBA" : event.location}</span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-3">
                                <Link
                                    href={`/gallery/${event.id}`}
                                    className="h-9 px-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-lg flex items-center gap-1.5 text-white text-xs font-bold transition-all"
                                >
                                    <span className="material-symbols-outlined text-sm">
                                        {totalPhotoCount > 0 ? "photo_library" : "add_a_photo"}
                                    </span>
                                    <span>{totalPhotoCount > 0 ? "Se alle bilder" : "Ingen bilder enda"}</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT GRID */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COLUMN (Main Content) */}
                <div className="lg:col-span-2 flex flex-col gap-8">

                    {/* About Section */}
                    <div className="flex flex-col gap-3">
                        <h2 className="text-xl font-bold text-gray-900">Om Arrangementet</h2>
                        <div className="prose prose-sm text-gray-500 leading-relaxed max-w-none">
                            {event.description ? (
                                <ReactMarkdown>{event.description}</ReactMarkdown>
                            ) : (
                                "Ingen beskrivelse tilgjengelig."
                            )}
                        </div>
                    </div>

                    {/* Program Section */}
                    <div className="flex flex-col gap-4 pt-8 border-t border-gray-200/60">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#4F46E5] text-lg">schedule</span>
                            <h2 className="text-lg font-bold text-gray-900">Program</h2>
                        </div>

                        <div className="relative pl-2 border-l border-gray-200 flex flex-col gap-6 ml-1.5">
                            {event.program && event.program.length > 0 ? (
                                event.program.map((item) => (
                                    <div key={item.id} className="relative pl-5">
                                        <div className="absolute -left-[11px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-[#4F46E5] bg-[#F9F9F7]"></div>
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-baseline gap-2.5 flex-wrap">
                                                {item.date && (
                                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                        {new Date(item.date).toLocaleDateString("no-NO", { weekday: 'short', day: 'numeric', month: 'short' })}
                                                    </span>
                                                )}
                                                <span className="text-sm font-bold text-gray-900">{item.time}</span>
                                                <span className="text-sm font-bold text-gray-900">-</span>
                                                <span className="text-sm font-bold text-gray-900">{item.title}</span>
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
                            <Link href={`/gallery/${event.id}`} className="text-[#4F46E5] text-xs font-bold flex items-center gap-1 hover:gap-2 transition-all">
                                <span>Se alle bilder</span>
                                <span className="material-symbols-outlined text-[1rem]">arrow_forward</span>
                            </Link>
                        </div>

                        {photos && photos.length > 0 ? (
                            <div className="grid grid-cols-3 gap-4">
                                {photos.slice(0, 6).map((photo, i) => (
                                    <Link
                                        href={`/gallery/${event.id}`}
                                        key={photo.id}
                                        className="aspect-square bg-gray-200 rounded-lg overflow-hidden relative group cursor-pointer"
                                    >
                                        <img
                                            src={photo.url}
                                            alt={photo.caption || ""}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />

                                        {/* Overlay for last item if there are more photos */}
                                        {i === 5 && totalPhotoCount > 6 && (
                                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-[2px] hover:backdrop-blur-[1px] transition-all">
                                                <span className="text-xl font-bold text-white">+{totalPhotoCount - 5}</span>
                                                <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">Bilder</span>
                                            </div>
                                        )}

                                        {/* Hover overlay for other items */}
                                        {!(i === 5 && totalPhotoCount > 6) && (
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                        )}
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center">
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                                    <span className="material-symbols-outlined text-gray-400">photo_library</span>
                                </div>
                                <p className="text-sm font-semibold text-gray-900">Ingen bilder enda</p>
                                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                                    Det er ikke lastet opp noen bilder fra dette arrangementet enda.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN (Sidebar) */}
                <div className="flex flex-col gap-6">

                    {/* Details Card */}
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-5">
                        <h3 className="text-base font-bold text-gray-900">Detaljer</h3>

                        <div className="flex flex-col gap-4">
                            {/* Start Time */}
                            {dateStr && (
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] flex items-center justify-center text-[#4F46E5]">
                                        <span className="material-symbols-outlined">schedule</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Start</span>
                                        <span className="text-sm font-bold text-gray-900">
                                            {dateStr} {timeStr}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* End Time */}
                            {endTimeStr && (
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] flex items-center justify-center text-[#4F46E5]">
                                        <span className="material-symbols-outlined">schedule</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Slutt</span>
                                        <span className="text-sm font-bold text-gray-900">
                                            {endDateStr !== dateStr ? `${endDateStr} ` : ''}{endTimeStr}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Registration Deadline */}
                            {regDeadlineStr && (
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-[#FFF7ED] flex items-center justify-center text-[#F97316]">
                                        <span className="material-symbols-outlined">event_busy</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Påmeldingsfrist</span>
                                        <span className="text-sm font-bold text-gray-900">{regDeadlineStr} kl {regDeadlineTimeStr}</span>
                                    </div>
                                </div>
                            )}

                            {/* Location */}
                            {(event.location || event.address || event.isTba) && (
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] flex items-center justify-center text-[#4F46E5]">
                                        <span className="material-symbols-outlined">domain</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sted</span>
                                        <span className="text-sm font-bold text-gray-900">{event.isTba ? "TBA" : (event.location || event.address)}</span>
                                        {event.address && !event.isTba && <span className="text-xs text-gray-500">{event.address}</span>}
                                        {event.isTba && <span className="text-xs text-gray-500">Sted kommer senere</span>}
                                    </div>
                                </div>
                            )}
                        </div>


                        {/* Map Placeholder */}
                        {(event.address && !event.isTba) && (
                            <div className="h-32 w-full bg-gray-100 rounded-lg overflow-hidden relative">
                                <iframe
                                    width="100%"
                                    height="100%"
                                    frameBorder="0"
                                    scrolling="no"
                                    marginHeight={0}
                                    marginWidth={0}
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(event.address || "")}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                    className="filter grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-500"
                                ></iframe>
                            </div>
                        )}
                        <div className="pt-2 border-t border-gray-100">
                            <AddToCalendarButton event={event} />
                        </div>
                    </div>

                    {/* Economy Card */}
                    {event.totalCost && (
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-5">
                            <h3 className="text-base font-bold text-gray-900">Kostnad (per pers.)</h3>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] flex items-center justify-center text-[#4F46E5]">
                                            <span className="material-symbols-outlined">receipt_long</span>
                                        </div>
                                        <span className="text-sm font-medium text-gray-600">Total kostnad</span>
                                    </div>
                                    <span className="font-bold text-gray-900">{event.totalCost.toLocaleString("nb-NO")},-</span>
                                </div>

                                {event.clubSubsidy && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] flex items-center justify-center text-[#2A9D8F]">
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
                                    <span className="text-xl font-bold text-[#4F46E5]">
                                        {((event.totalCost || 0) - (event.clubSubsidy || 0)).toLocaleString("nb-NO")},-
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Attendees Card */}
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-gray-900">Deltakere</h3>
                            <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 bg-[#EEF2FF] text-[#4F46E5] rounded text-[10px] font-bold">
                                    {attendeeCount} {event.maxAttendees ? `/ ${event.maxAttendees}` : ''}
                                </span>
                            </div>
                        </div>

                        {attendees.length > 0 ? (
                            <div className="flex items-center -space-x-3 overflow-hidden py-1">
                                {attendees.slice(0, 5).map((a, i) => (
                                    <Avatar
                                        key={a.id}
                                        initials={a.firstName && a.lastName ? `${a.firstName[0]}${a.lastName[0]}`.toUpperCase() : (a.firstName || a.email).substring(0, 2).toUpperCase()}
                                        alt={`${a.firstName || ''} ${a.lastName || ''}`}
                                        className="w-10 h-10 border-2 border-white ring-1 ring-gray-100"
                                    />
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

                        <button
                            onClick={() => setShowAttendees(true)}
                            className="w-full py-2.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Se deltakerliste
                        </button>
                    </div>

                    {/* Action Card (Join/Leave) */}
                    {!event.hasPassed && (
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-4">
                            <h3 className="text-base font-bold text-gray-900">Påmelding</h3>
                            <p className="text-xs text-gray-500">
                                {currentUserIsAttending
                                    ? "Du er påmeldt dette arrangementet."
                                    : (isRegistrationClosed
                                        ? "Påmeldingsfristen er over."
                                        : "Meld deg på arrangementet her.")}
                            </p>

                            <button
                                onClick={handleAttendance}
                                disabled={isPending || (!currentUserIsAttending && isRegistrationClosed)}
                                className={`w-full py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${currentUserIsAttending
                                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                                    : (!currentUserIsAttending && isRegistrationClosed)
                                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                        : "bg-gray-900 text-white hover:bg-gray-800 shadow-lg hover:shadow-xl"
                                    }`}
                            >
                                {isPending ? (
                                    <span className="material-symbols-outlined animate-spin text-[1.2rem]">refresh</span>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[1.2rem]">
                                            {currentUserIsAttending ? "remove_circle" : (isRegistrationClosed ? "block" : "check_circle")}
                                        </span>
                                        {currentUserIsAttending ? "Meld meg av" : (isRegistrationClosed ? "Påmelding stengt" : "Meld meg på")}
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                </div>

            </div >
            {/* ATTENDEE MODAL */}
            {showAttendees && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setShowAttendees(false)}
                    />

                    {/* Modal Content */}
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white z-10">
                            <h3 className="text-sm font-bold text-gray-900">Deltakere ({attendees.length})</h3>
                            <button
                                onClick={() => setShowAttendees(false)}
                                className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                            >
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>

                        {/* Modal Body (List) */}
                        <div className="overflow-y-auto p-2 scrollbar-hide">
                            {attendees.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                    {attendees.map((attendee) => (
                                        <div key={attendee.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                            <Avatar
                                                initials={attendee.firstName && attendee.lastName ? `${attendee.firstName[0]}${attendee.lastName[0]}`.toUpperCase() : (attendee.firstName || attendee.email).substring(0, 2).toUpperCase()}
                                                alt={`${attendee.firstName || ''} ${attendee.lastName || ''}`}
                                                className="w-8 h-8 flex-shrink-0 text-[10px]"
                                            />
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-bold text-gray-900 truncate">
                                                    {attendee.firstName ? `${attendee.firstName} ${attendee.lastName || ''}` : 'Anonym'}
                                                </span>
                                                <span className="text-[10px] text-gray-500 truncate">{attendee.email}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-8 text-center text-gray-400 text-xs">
                                    Ingen deltakere enda.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
