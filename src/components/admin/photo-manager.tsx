"use client";

import { useState, useEffect, useRef } from "react";
import { useUploadThing } from "@/lib/uploadthing";
import { deletePhotos, getRecentEvents, getRecentPhotos, getStorageStats } from "@/actions/admin-photos";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

interface PhotoManagerProps {
    initialEvents: Awaited<ReturnType<typeof getRecentEvents>>;
    initialPhotos: Awaited<ReturnType<typeof getRecentPhotos>>;
}

export function PhotoManager({ initialEvents, initialPhotos }: PhotoManagerProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const eventIdParam = searchParams.get("eventId");

    // State
    const [selectedEventId, setSelectedEventId] = useState<string>(eventIdParam || "");
    const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);
    const [storageStats, setStorageStats] = useState<{ totalBytes: number, filesUploaded: number } | null>(null);

    // Custom Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { startUpload } = useUploadThing("eventImage", {
        onClientUploadComplete: () => {
            setIsUploading(false);
            setUploadProgress(0);
            router.refresh();
            alert("Bilder lastet opp!");
        },
        onUploadError: (error: Error) => {
            setIsUploading(false);
            setUploadProgress(0);
            alert(`Feil under opplasting: ${error.message}`);
        },
        onUploadBegin: () => {
            // Do not reset progress here as it might fire multiple times for batched uploads
            setIsUploading(true);
        },
        onUploadProgress: (progress) => {
            setUploadProgress(progress);
        },
    });

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setIsUploading(true);
        setUploadProgress(0);
        const files = Array.from(e.target.files);

        try {
            await startUpload(files, { eventId: selectedEventId });
        } catch (error) {
            console.error("Upload failed", error);
            setIsUploading(false);
        }

        // Reset input
        e.target.value = "";
    };

    // Sync state with URL - only update when URL param actually changes
    useEffect(() => {
        setSelectedEventId(eventIdParam || "");
    }, [eventIdParam]);

    useEffect(() => {
        getStorageStats().then(stats => {
            if (stats) setStorageStats(stats);
        });
    }, [initialPhotos, isDeleting]); // Refresh when photos change or deletion happens

    // Derived state
    const currentEvent = initialEvents.find(e => e.id === selectedEventId);
    const photoCount = currentEvent?._count?.photos ?? 0;
    const isAllSelected = initialPhotos.length > 0 && selectedPhotos.size === initialPhotos.length;

    // Dropdown state
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Close dropdown when clicking outside (simple version)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.event-dropdown-container')) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectEvent = (eventId: string) => {
        setSelectedEventId(eventId);
        setSelectedPhotos(new Set());
        setIsDropdownOpen(false);
        if (eventId) {
            router.push(`?eventId=${eventId}`);
        } else {
            router.push("?");
        }
    };

    const togglePhotoSelection = (photoId: string) => {
        const newSelection = new Set(selectedPhotos);
        if (newSelection.has(photoId)) {
            newSelection.delete(photoId);
        } else {
            newSelection.add(photoId);
        }
        setSelectedPhotos(newSelection);
    };

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedPhotos(new Set());
        } else {
            setSelectedPhotos(new Set(initialPhotos.map(p => p.id)));
        }
    };

    // Sync selection with available photos (to handle deletions gracefully)
    useEffect(() => {
        const validSelections = new Set<string>();
        for (const id of selectedPhotos) {
            if (initialPhotos.some(p => p.id === id)) {
                validSelections.add(id);
            }
        }
        if (validSelections.size !== selectedPhotos.size) {
            setSelectedPhotos(validSelections);
        }
    }, [initialPhotos, selectedPhotos]);

    const handleBulkDelete = async () => {
        if (selectedPhotos.size === 0) return;
        if (!confirm(`Er du sikker på at du vil slette ${selectedPhotos.size} bilder?`)) return;

        setIsDeleting(true);
        try {
            await deletePhotos(Array.from(selectedPhotos));
            // Don't clear selection here; let the effect above handle it when initialPhotos updates
            router.refresh();
        } catch (error) {
            alert("Feil under sletting");
            console.error(error);
            setIsDeleting(false); // Only stop loading on error (success keeps loading until refresh)
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Administrer Eventbilder</h1>
            <p className="text-gray-500 -mt-4 mb-6">Velg arrangement for å laste opp eller redigere bildearkivet.</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Col: Event Details (2/3 width) */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-8 shadow-sm flex flex-col justify-between min-h-[320px]">
                    <div className="relative event-dropdown-container">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                            VELG AKTIVT ARRANGEMENT
                        </label>

                        {/* Custom Dropdown Trigger */}
                        <div
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="group cursor-pointer flex items-center justify-between border-b-2 border-gray-100 py-2 hover:border-gray-300 transition-colors"
                        >
                            <span className={`text-2xl font-bold truncate ${selectedEventId ? 'text-gray-900' : 'text-gray-500'}`}>
                                {currentEvent ? currentEvent.title : "Alle Bilder"}
                            </span>
                            <span className={`material-symbols-outlined text-gray-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`}>
                                Keyboard_arrow_down
                            </span>
                        </div>

                        {/* Custom Dropdown Menu */}
                        <div className={`absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden transition-all duration-200 origin-top ${isDropdownOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'}`}>
                            <div className="max-h-[300px] overflow-y-auto py-1">
                                <button
                                    onClick={() => handleSelectEvent("")}
                                    className={`w-full text-left px-5 py-3 hover:bg-gray-50 flex items-center justify-between transition-colors ${selectedEventId === "" ? 'bg-amber-50 text-amber-900' : 'text-gray-700'}`}
                                >
                                    <span className="font-medium">Alle Bilder</span>
                                    {selectedEventId === "" && <span className="material-symbols-outlined text-amber-500 text-sm">check</span>}
                                </button>
                                {initialEvents.map((event) => (
                                    <button
                                        key={event.id}
                                        onClick={() => handleSelectEvent(event.id)}
                                        className={`w-full text-left px-5 py-3 hover:bg-gray-50 flex items-center justify-between transition-colors ${selectedEventId === event.id ? 'bg-amber-50 text-amber-900' : 'text-gray-700'}`}
                                    >
                                        <div>
                                            <span className="font-medium block truncate">{event.title}</span>
                                            <span className="text-xs text-gray-400 font-normal">
                                                {new Date(event.startAt).toLocaleDateString("nb-NO", { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </span>
                                        </div>
                                        {selectedEventId === event.id && <span className="material-symbols-outlined text-amber-500 text-sm">check</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-8 mt-8 pt-8 border-t border-gray-100 border-dashed">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">EVENT DATO</p>
                            <div className="flex items-center gap-2 text-gray-700 font-medium">
                                <span className="material-symbols-outlined text-amber-500">calendar_today</span>
                                {currentEvent ? new Date(currentEvent.startAt).toLocaleDateString("nb-NO", { day: 'numeric', month: 'long', year: 'numeric' }) : "—"}
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">ARKIVSTATUS</p>
                            <div className="flex items-center gap-2 text-gray-700 font-medium">
                                <span className="material-symbols-outlined text-amber-500">photo_library</span>
                                {currentEvent ? `${photoCount} bilder` : `${initialPhotos.length} totalt`}
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">LAGRINGSPLASS</p>
                            <div className="flex items-center gap-2 text-gray-700 font-medium">
                                <span className="material-symbols-outlined text-amber-500">cloud</span>
                                <span>
                                    {storageStats
                                        ? `${(storageStats.totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB / 2 GB`
                                        : "—"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Col: Custom Upload UI */}
                <div className={`bg-white rounded-2xl border-2 border-dashed ${selectedEventId ? 'border-gray-200' : 'border-gray-100 opacity-60'} p-8 shadow-sm flex flex-col items-center justify-center min-h-[320px] relative transition-colors ${isUploading ? 'bg-amber-50 border-amber-200' : ''}`}>
                    {selectedEventId ? (
                        <div className="w-full flex flex-col items-center text-center">

                            {/* Hidden Input */}
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                disabled={isUploading}
                            />

                            {isUploading ? (
                                <div className="flex flex-col items-center animate-in fade-in duration-300 w-full max-w-xs">
                                    <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mb-4"></div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">Laster opp bilder...</h3>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2 overflow-hidden">
                                        <div
                                            className="bg-amber-500 h-2.5 rounded-full transition-all duration-300 ease-out"
                                            style={{ width: `${uploadProgress}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-gray-500 text-sm">{Math.round(uploadProgress)}% ferdig</p>
                                </div>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4 text-amber-600">
                                        <span className="material-symbols-outlined text-3xl">cloud_upload</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">Last opp bilder</h3>
                                    <p className="text-gray-500 text-sm mb-2 max-w-[200px]">Dra og slipp bilder her, eller klikk for å velge filer.</p>
                                    <p className="text-amber-600/80 text-xs font-medium mb-6 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">Max 50 bilder (opp til 8MB per fil)</p>

                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="bg-amber-500 hover:bg-amber-600 text-white font-medium px-8 py-3 rounded-full transition-transform active:scale-95 shadow-md shadow-amber-500/20"
                                    >
                                        Velg filer fra maskin
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                <span className="material-symbols-outlined text-3xl">cloud_off</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Last opp nye bilder</h3>
                            <p className="text-gray-500 text-sm">Velg et arrangement til venstre for å aktivere opplasting.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-6">
                    <button
                        onClick={toggleSelectAll}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                    >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isAllSelected ? "bg-amber-500 border-amber-500 text-white" : "border-gray-300"}`}>
                            {isAllSelected && <span className="material-symbols-outlined text-[10px] font-bold">check</span>}
                        </div>
                        Velg alle
                    </button>
                    <span className="text-gray-500 text-sm">Viser <strong className="text-gray-900">{initialPhotos.length}</strong> bilder</span>
                </div>

                <div className="flex items-center gap-4">
                    {selectedPhotos.size > 0 && (
                        <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-200">
                            <div className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-sm font-medium border border-amber-100">
                                {selectedPhotos.size} markert
                            </div>
                            <button
                                onClick={handleBulkDelete}
                                disabled={isDeleting}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm transition-colors text-sm font-medium disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-lg">delete</span>
                                {isDeleting ? "Sletter..." : "Slett valgte"}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {initialPhotos.map((photo) => {
                    const isSelected = selectedPhotos.has(photo.id);
                    return (
                        <div
                            key={photo.id}
                            onClick={() => togglePhotoSelection(photo.id)}
                            className={`group relative aspect-square bg-gray-100 rounded-xl overflow-hidden cursor-pointer transition-all ${isSelected ? 'ring-4 ring-amber-500 z-10' : 'hover:shadow-md border border-gray-200'}`}
                        >
                            <Image
                                src={photo.url}
                                alt={photo.event.title}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                            />

                            {/* Selection Overlay */}
                            <div className={`absolute inset-0 transition-colors flex items-start justify-end p-2 ${isSelected ? 'bg-black/20' : 'bg-black/0 group-hover:bg-black/10'}`}>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-amber-500 border-amber-500 text-white' : 'bg-black/30 border-white/50 text-transparent group-hover:bg-white group-hover:border-white group-hover:text-gray-300'}`}>
                                    <span className="material-symbols-outlined text-sm font-bold">{isSelected ? 'check' : ''}</span>
                                </div>
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="text-white text-[10px] font-medium truncate opacity-90">{photo.event.title}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
            {initialPhotos.length === 0 && (
                <div className="text-center py-20">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                        <span className="material-symbols-outlined text-3xl">image_not_supported</span>
                    </div>
                    <p className="text-gray-500">Ingen bilder funnet i arkivet.</p>
                </div>
            )}
        </div>
    );
}
