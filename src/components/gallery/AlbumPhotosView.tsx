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
        <div className="flex flex-col gap-8 min-w-0 overflow-x-hidden">

            {/* ── Page Header ─────────────────────────────────────────── */}
            <div className="flex items-end justify-between gap-4 pt-1">
                <div>
                    <h1
                        className="text-3xl sm:text-4xl font-normal text-gray-900 leading-none"
                        style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                    >
                        <em>{album.title}</em>
                    </h1>
                    <div className="flex items-center gap-3 mt-3">
                        <div className="h-px w-8 bg-gray-300" />
                        <p className="text-[11px] text-gray-400 italic" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                            {album.day}. {album.month} {album.year}
                            {album.location && ` · ${album.location}`}
                        </p>
                    </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 shrink-0 hidden sm:block">
                    {album.photos.length} bilder
                </span>
            </div>

            {/* ── Photo Grid ──────────────────────────────────────────── */}
            {album.photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {album.photos.map((photo, index) => (
                        <div
                            key={photo.id}
                            className="aspect-square relative group cursor-pointer overflow-hidden rounded-xl bg-gray-100"
                            onClick={() => openLightbox(index)}
                        >
                            <img
                                src={photo.url}
                                alt={photo.caption || `Bilde fra ${album.title}`}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="material-symbols-outlined text-white/90 drop-shadow-md text-lg">fullscreen</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200">
                    <span className="material-symbols-outlined text-3xl text-gray-200">no_photography</span>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-300">Ingen bilder ennå</p>
                </div>
            )}

            {/* ── Lightbox ────────────────────────────────────────────── */}
            {lightboxIndex !== null && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4"
                    onClick={closeLightbox}
                >
                    {/* Counter */}
                    <div className="absolute top-5 left-5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                        {lightboxIndex + 1} / {album.photos.length}
                    </div>

                    {/* Close */}
                    <button
                        onClick={closeLightbox}
                        className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-2 z-50"
                    >
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>

                    {/* Prev */}
                    <button
                        onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-3 hidden md:block z-50 hover:bg-white/5 rounded-full"
                    >
                        <span className="material-symbols-outlined text-4xl">chevron_left</span>
                    </button>

                    {/* Next */}
                    <button
                        onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-3 hidden md:block z-50 hover:bg-white/5 rounded-full"
                    >
                        <span className="material-symbols-outlined text-4xl">chevron_right</span>
                    </button>

                    {/* Image */}
                    <div
                        className="relative flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={album.photos[lightboxIndex].url}
                            alt={album.photos[lightboxIndex].caption || ""}
                            className="max-w-[90vw] max-h-[88vh] object-contain rounded-sm shadow-2xl"
                        />
                        {album.photos[lightboxIndex].caption && (
                            <div className="absolute bottom-0 left-0 right-0 text-center text-[11px] text-white/70 bg-black/50 py-2 px-4 backdrop-blur-sm rounded-b-sm">
                                {album.photos[lightboxIndex].caption}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
