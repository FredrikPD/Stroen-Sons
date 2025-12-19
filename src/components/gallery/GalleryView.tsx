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
        <div className="w-full bg-white min-h-full space-y-12">
            {/* Header */}
            <div className="mb-12">
                <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-2">Bildearkiv</h1>
                <p className="text-gray-500 text-lg">
                    Se bilder fra tidligere arrangementer og events.
                </p>
            </div>

            {/* Search and Filters Bar */}
            <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-200/60 mb-12 flex flex-col md:flex-row items-center gap-4 justify-between">
                <div className="relative flex-1 w-full">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[1.2rem]">search</span>
                    <input
                        type="text"
                        placeholder="Søk etter årstall, sted eller begivenhet..."
                        className="w-full pl-10 pr-4 py-2 text-sm bg-transparent border-none focus:ring-0 placeholder:text-gray-400 text-gray-900"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 p-1 overflow-x-auto w-full md:w-auto">
                    <button
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${selectedYear === 'ALL' ? 'bg-[#4F46E5] text-white' : 'hover:bg-gray-50 text-gray-600'}`}
                        onClick={() => setSelectedYear('ALL')}
                    >
                        Alle
                    </button>
                    {/* Mock Category Filters for Visual Match - functionality could be added later if category exists in DB */}
                    {['Årsfester', 'Middager', 'Reiser', 'Julebord'].map(cat => (
                        <button key={cat} className="px-4 py-1.5 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-md text-sm font-medium transition-all whitespace-nowrap">
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-12">
                {/* Left Sidebar - Year Navigation */}
                <div className="w-full md:w-48 flex-shrink-0 hidden md:block">
                    <div className="sticky top-8 flex flex-col gap-1">
                        {years.map(year => (
                            <button
                                key={year}
                                onClick={() => setSelectedYear(year)}
                                className={`text-left px-4 py-2 font-bold text-sm border-l-2 transition-colors ${selectedYear === year ? 'border-[#4F46E5] text-[#4F46E5]' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                            >
                                {year}
                            </button>
                        ))}
                        <button className="text-left px-4 py-2 font-medium text-sm text-gray-400 flex items-center gap-1 hover:text-gray-600 transition-colors mt-2">
                            Eldre arkiv
                            <span className="material-symbols-outlined text-[1rem]">arrow_forward</span>
                        </button>
                    </div>
                </div>

                {/* Main Content - Event List */}
                <div className="flex-1 flex flex-col gap-12">
                    {displayYears.map(year => (
                        <div key={year}>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">{year}</h2>
                            <div className="flex flex-col gap-6">
                                {albumsByYear[year].map(album => (
                                    <div key={album.id} className="bg-white rounded-xl p-0 shadow-sm border border-gray-200/60 overflow-hidden flex flex-col lg:flex-row group hover:shadow-md transition-shadow">
                                        {/* Image */}
                                        <div className="lg:w-[320px] h-64 lg:h-auto overflow-hidden relative flex-shrink-0">
                                            <img
                                                src={album.coverImage || "/placeholder-image.jpg"}
                                                alt={album.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                            />
                                            <div className="absolute inset-0 bg-black/5"></div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 p-6 flex flex-col">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="border border-gray-200 rounded px-2 py-1 text-xs font-mono text-gray-500 bg-gray-50">
                                                    {album.day}. {album.month}
                                                </div>
                                            </div>

                                            <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-[#4F46E5] transition-colors">
                                                {album.title}
                                            </h3>

                                            {album.location && (
                                                <div className="flex items-center gap-1.5 text-gray-500 text-sm font-medium mb-4">
                                                    <span className="material-symbols-outlined text-[1.1rem]">location_on</span>
                                                    {album.location}
                                                </div>
                                            )}

                                            <div className="flex items-end justify-between gap-4 mt-auto">
                                                <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                                                    {album.description || "Ingen beskrivelse tilgjengelig for dette arrangementet."}
                                                </p>

                                                <Link href={`/gallery/${album.id}`} className="text-[#4F46E5] font-bold text-sm flex items-center gap-1 whitespace-nowrap flex-shrink-0 mb-0.5 group">
                                                    <span className="group-hover:underline">Se bilder</span>
                                                    <span className="material-symbols-outlined text-[1.1rem]">arrow_forward</span>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {filteredAlbums.length === 0 && (
                        <div className="py-20 text-center flex flex-col items-center gap-4 text-gray-400">
                            <span className="material-symbols-outlined text-4xl">search_off</span>
                            <p>Ingen arrangementer funnet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
