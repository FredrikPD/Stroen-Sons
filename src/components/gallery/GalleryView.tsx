"use client";

import { useState } from "react";
import Link from "next/link";
import { Album } from "@/app/(protected)/gallery/actions";

interface GalleryViewProps {
    albums: Album[];
}

export default function GalleryView({ albums }: GalleryViewProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedYear, setSelectedYear] = useState<number | "ALL">("ALL");

    const years = Array.from(new Set(albums.map(a => a.year))).sort((a, b) => b - a);

    const filteredAlbums = albums.filter(album => {
        const matchesSearch =
            album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (album.location && album.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (album.description && album.description.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesYear = selectedYear === "ALL" || album.year === selectedYear;
        return matchesSearch && matchesYear;
    });

    const albumsByYear = filteredAlbums.reduce((acc, album) => {
        if (!acc[album.year]) acc[album.year] = [];
        acc[album.year].push(album);
        return acc;
    }, {} as Record<number, Album[]>);

    const displayYears = Object.keys(albumsByYear).map(Number).sort((a, b) => b - a);

    return (
        <div className="flex flex-col gap-8 min-w-0 overflow-x-hidden">

            {/* ── Page Header ─────────────────────────────────────────── */}
            <div className="flex items-end justify-between gap-4 pt-1">
                <div>
                    <h1
                        className="text-3xl sm:text-4xl font-normal text-gray-900 leading-none"
                        style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                    >
                        <em>Bildearkiv</em>
                    </h1>
                    <div className="flex items-center gap-3 mt-3">
                        <div className="h-px w-8 bg-gray-300" />
                        <p className="text-[11px] text-gray-400 italic" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                            Minner fra fellesskapet
                        </p>
                    </div>
                </div>
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest shrink-0 hidden sm:block">
                    {albums.length} album{albums.length !== 1 ? "er" : ""}
                </p>
            </div>

            <div className="flex flex-col md:flex-row gap-6 min-w-0">

                {/* ── Left Sidebar — Year Navigation ────────────────────── */}
                <div className="w-full md:w-28 flex-shrink-0 hidden md:block">
                    <div className="sticky top-8 flex flex-col gap-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400 px-3 pb-2">Årstall</span>
                        <button
                            className={`text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                                selectedYear === "ALL"
                                    ? "bg-gray-900 text-white"
                                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                            }`}
                            onClick={() => setSelectedYear("ALL")}
                        >
                            Alle år
                        </button>
                        {years.map(year => (
                            <button
                                key={year}
                                onClick={() => setSelectedYear(year)}
                                className={`text-left px-3 py-1.5 text-xs font-bold border-l-2 transition-colors ${
                                    selectedYear === year
                                        ? "border-gray-900 text-gray-900"
                                        : "border-transparent text-gray-400 hover:text-gray-700"
                                }`}
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Main Content ──────────────────────────────────────── */}
                <div className="flex-1 flex flex-col gap-8 min-w-0">

                    {/* Search + mobile year select */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-[18px]">search</span>
                            <input
                                type="text"
                                placeholder="Søk etter sted eller begivenhet..."
                                className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 placeholder:text-gray-300 text-gray-900 transition-colors"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <select
                            className="md:hidden text-xs border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700 bg-white focus:outline-none focus:border-gray-400"
                            value={selectedYear}
                            onChange={(e) =>
                                setSelectedYear(e.target.value === "ALL" ? "ALL" : Number(e.target.value))
                            }
                        >
                            <option value="ALL">Alle år</option>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    {/* Album groups by year */}
                    {displayYears.map(year => (
                        <div key={year}>
                            {/* Year section header */}
                            <div className="flex items-center gap-4 mb-4">
                                <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">{year}</span>
                                <div className="flex-1 h-px bg-gray-100" />
                                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                                    {albumsByYear[year].length} album{albumsByYear[year].length !== 1 ? "er" : ""}
                                </span>
                            </div>

                            <div className="flex flex-col gap-2">
                                {albumsByYear[year].map(album => (
                                    <Link
                                        key={album.id}
                                        href={`/gallery/${album.id}`}
                                        className="group flex items-stretch bg-white rounded-xl overflow-hidden border border-gray-200 hover:border-gray-400 hover:shadow-sm transition-all"
                                    >
                                        {/* Cover image */}
                                        <div className="w-40 sm:w-56 aspect-video flex-shrink-0 overflow-hidden bg-gray-100">
                                            {album.coverImage ? (
                                                <img
                                                    src={album.coverImage}
                                                    alt={album.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-2xl text-gray-300">photo_library</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0 px-5 py-5 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-[9px] font-bold tracking-widest text-gray-400 uppercase">
                                                        {album.day}. {album.month} {album.year}
                                                    </span>
                                                </div>
                                                <h3 className="font-bold text-base text-gray-900 group-hover:text-gray-600 transition-colors leading-snug">
                                                    {album.title}
                                                </h3>
                                                {album.location && (
                                                    <div className="flex items-center gap-1 text-gray-400 text-xs mt-1.5">
                                                        <span className="material-symbols-outlined text-[13px]">location_on</span>
                                                        <span className="truncate">{album.location}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 text-gray-300 mt-3">
                                                <span className="material-symbols-outlined text-[14px]">photo_library</span>
                                                <span className="text-xs font-bold tabular-nums">{album.photoCount} bilder</span>
                                            </div>
                                        </div>

                                        {/* Arrow */}
                                        <div className="flex items-center pr-5 text-gray-300 group-hover:text-gray-500 transition-colors">
                                            <span className="material-symbols-outlined text-base">chevron_right</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}

                    {filteredAlbums.length === 0 && (
                        <div className="text-center py-8 rounded-xl border border-dashed border-gray-200">
                            <p className="text-xs text-gray-400 italic" style={{ fontFamily: "'Georgia', serif" }}>
                                Ingen albumet funnet.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
