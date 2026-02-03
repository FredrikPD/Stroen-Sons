"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AlbumDetails } from "@/app/(protected)/gallery/actions";

interface AlbumPhotosViewProps {
    album: AlbumDetails;
}

export default function AlbumPhotosView({ album }: AlbumPhotosViewProps) {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    const openLightbox = (index: number) => setLightboxIndex(index);
    const closeLightbox = () => setLightboxIndex(null);

    const nextPhoto = useCallback(() => {
        setLightboxIndex((prev) => (prev !== null && prev < album.photos.length - 1 ? prev + 1 : 0));
    }, [album.photos.length]);

    const prevPhoto = useCallback(() => {
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : album.photos.length - 1));
    }, [album.photos.length]);

    // Keyboard navigation
    useEffect(() => {
        if (lightboxIndex === null) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeLightbox();
            if (e.key === "ArrowRight") nextPhoto();
            if (e.key === "ArrowLeft") prevPhoto();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [lightboxIndex, nextPhoto, prevPhoto]);

    return (
        <div className="w-full bg-white min-h-full space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-6">


                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <span className="bg-[#4F46E5] text-white px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                            ALBUM
                        </span>
                        <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                            <span>{album.day}. {album.month} {album.year}</span>
                            {album.location && (
                                <>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    <span>{album.location}</span>
                                </>
                            )}
                        </div>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">{album.title}</h1>
                </div>
            </div>

            <div className="w-full border-b border-gray-100"></div>

            {/* Photo Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {album.photos.map((photo, index) => (
                    <div
                        key={photo.id}
                        className="aspect-square relative group cursor-pointer overflow-hidden rounded-lg bg-gray-100"
                        onClick={() => openLightbox(index)}
                    >
                        <img
                            src={photo.url}
                            alt={photo.caption || `Bilde fra ${album.title}`}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="material-symbols-outlined text-white/90 drop-shadow-md">fullscreen</span>
                        </div>
                    </div>
                ))}

                {album.photos.length === 0 && (
                    <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 text-gray-400">
                        <span className="material-symbols-outlined text-4xl">no_photography</span>
                        <p>Dette albumet har ingen bilder ennå.</p>
                    </div>
                )}
            </div>

            {/* Lightbox Modal */}
            {lightboxIndex !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-200">

                    {/* Close Button */}
                    <button
                        onClick={closeLightbox}
                        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors p-2 z-50"
                    >
                        <span className="material-symbols-outlined text-4xl">close</span>
                    </button>

                    {/* Navigation Buttons */}
                    <button
                        onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors p-4 hidden md:block z-50 hover:bg-white/5 rounded-full"
                    >
                        <span className="material-symbols-outlined text-5xl">chevron_left</span>
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors p-4 hidden md:block z-50 hover:bg-white/5 rounded-full"
                    >
                        <span className="material-symbols-outlined text-5xl">chevron_right</span>
                    </button>

                    {/* Main Image */}
                    <div className="relative max-w-full max-h-full flex items-center justify-center">
                        <img
                            src={album.photos[lightboxIndex].url}
                            alt={album.photos[lightboxIndex].caption || ""}
                            className="max-w-[90vw] max-h-[90vh] object-contain shadow-2xl rounded-sm"
                        />
                        {album.photos[lightboxIndex].caption && (
                            <div className="absolute bottom-4 left-0 right-0 text-center text-white/80 bg-black/50 p-2 backdrop-blur-sm">
                                {album.photos[lightboxIndex].caption}
                            </div>
                        )}
                    </div>

                    {/* Counter */}
                    <div className="absolute top-4 left-4 text-white/50 font-medium text-sm">
                        {lightboxIndex + 1} / {album.photos.length}
                    </div>
                </div>
            )}
        </div>
    );
}
