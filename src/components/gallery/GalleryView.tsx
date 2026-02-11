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

    // Get unique years for the sidebar
    const years = Array.from(new Set(albums.map(a => a.year))).sort((a, b) => b - a);

    // Filter albums
    const filteredAlbums = albums.filter(album => {
        const matchesSearch = album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (album.location && album.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (album.description && album.description.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesYear = selectedYear === "ALL" || album.year === selectedYear;
        return matchesSearch && matchesYear;
    });

    // Group filtered albums by year for display
    const albumsByYear = filteredAlbums.reduce((acc, album) => {
        if (!acc[album.year]) {
            acc[album.year] = [];
        }
        acc[album.year].push(album);
        return acc;
    }, {} as Record<number, Album[]>);

    // Sort years descending for display
    const displayYears = Object.keys(albumsByYear).map(Number).sort((a, b) => b - a);

    return (
        <div className="w-full bg-white min-h-full space-y-4">
            {/* Header */}
            <div className="flex flex-col w-full">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Bildearkiv</h1>
                <p className="text-gray-500 text-sm">
                    Se bilder fra tidligere arrangementer og events.
                </p>
            </div>

            {/* Search and Filters Bar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200/60 mb-8 flex flex-col md:flex-row items-center gap-3 justify-between">
                <div className="relative flex-1 p-2 w-full">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                    <input
                        type="text"
                        placeholder="Søk etter årstall, sted eller begivenhet..."
                        className="w-full pl-9 pr-4 py-1 text-sm bg-transparent border-none focus:ring-0 focus:outline-none placeholder:text-gray-400 text-gray-900"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Left Sidebar - Year Navigation */}
                <div className="w-full md:w-32 flex-shrink-0 hidden md:block">
                    <div className="sticky top-8 flex flex-col gap-0.5">
                        <button
                            className={`text-left px-3 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${selectedYear === 'ALL' ? 'bg-[#4F46E5] text-white' : 'hover:bg-gray-50 text-gray-600'}`}
                            onClick={() => setSelectedYear('ALL')}
                        >
                            Alle år
                        </button>
                        {years.map(year => (
                            <button
                                key={year}
                                onClick={() => setSelectedYear(year)}
                                className={`text-left px-3 py-1.5 font-bold text-xs border-l-2 transition-colors ${selectedYear === year ? 'border-[#4F46E5] text-[#4F46E5]' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content - Event List */}
                <div className="flex-1 flex flex-col gap-8">
                    {displayYears.map(year => (
                        <div key={year}>
                            <h2 className="text-xl font-bold text-gray-900 mb-3 ml-1">{year}</h2>
                            <div className="flex flex-col gap-4">
                                {albumsByYear[year].map(album => (
                                    <Link
                                        key={album.id}
                                        href={`/gallery/${album.id}`}
                                        className="bg-white rounded-xl p-0 shadow-sm border border-gray-200/60 overflow-hidden flex flex-col lg:flex-row group hover:shadow-md transition-shadow"
                                    >
                                        {/* Image */}
                                        <div className="lg:w-[240px] h-48 lg:h-auto overflow-hidden relative flex-shrink-0">
                                            <img
                                                src={album.coverImage || "/placeholder-image.jpg"}
                                                alt={album.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                            />
                                            <div className="absolute inset-0 bg-black/5"></div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 p-4 flex flex-col">
                                            <div className="flex items-start justify-between mb-1">
                                                <div className="border border-gray-200 rounded px-1.5 py-0.5 text-[10px] font-mono text-gray-500 bg-gray-50">
                                                    {album.day}. {album.month}
                                                </div>
                                            </div>

                                            <h3 className="text-lg font-bold text-gray-900 mb-1.5 group-hover:text-[#4F46E5] transition-colors">
                                                {album.title}
                                            </h3>

                                            {album.location && (
                                                <div className="flex items-center gap-1 text-gray-500 text-xs font-medium mb-2">
                                                    <span className="material-symbols-outlined text-sm">location_on</span>
                                                    {album.location}
                                                </div>
                                            )}

                                            <div className="flex items-end justify-between gap-4 mt-auto">
                                                <p className="text-gray-600 text-xs leading-relaxed line-clamp-2">
                                                    {album.description || "Ingen beskrivelse tilgjengelig for dette arrangementet."}
                                                </p>

                                                <div className="text-[#4F46E5] font-bold text-xs flex items-center gap-1 whitespace-nowrap flex-shrink-0 mb-0.5">
                                                    <span className="group-hover:underline">Se bilder</span>
                                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}

                    {filteredAlbums.length === 0 && (
                        <div className="py-12 text-center flex flex-col items-center gap-2 text-gray-400">
                            <span className="material-symbols-outlined text-3xl">search_off</span>
                            <p className="text-xs">Ingen arrangementer funnet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
