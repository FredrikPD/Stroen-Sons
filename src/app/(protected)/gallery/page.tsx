"use server";

import { getAlbums } from "./actions";
import Link from "next/link";

export default async function GalleryPage() {
    const albums = await getAlbums();

    const featuredAlbum = albums[0];
    const gridAlbums = albums.slice(1);

    return (
        <div className="flex-1 bg-[#F5F5F0] overflow-y-auto">
            <div className="max-w-7xl mx-auto px-8 py-12 flex flex-col gap-12">
                {/* Header */}
                <div className="flex flex-col gap-8">
                    <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-2 max-w-2xl">
                            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Bildearkiv</h1>
                            <p className="text-gray-500 text-lg leading-relaxed">
                                Gjenopplev øyeblikkene fra historien vår. Bla gjennom høyoppløselige bilder fra tidligere arrangementer og sammenkomster.
                            </p>
                        </div>
                        <button className="bg-[#C5A66B] hover:bg-[#B39459] text-white px-6 py-3 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-sm hover:shadow-md">
                            <span className="material-symbols-outlined text-[1.2rem]">upload</span>
                            Last opp bilder
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-3">
                            <span className="text-sm font-bold text-gray-900">Filtrer etter år</span>
                            <div className="flex items-center gap-2">
                                <button className="px-5 py-2 bg-[#C5A66B] text-white rounded-full text-xs font-bold transition-all shadow-sm">
                                    Alle år
                                </button>
                                <button className="px-5 py-2 bg-white text-gray-600 hover:bg-gray-50 rounded-full text-xs font-bold transition-all border border-gray-200/50">
                                    2023
                                </button>
                                <button className="px-5 py-2 bg-white text-gray-600 hover:bg-gray-50 rounded-full text-xs font-bold transition-all border border-gray-200/50">
                                    2022
                                </button>
                                <button className="px-5 py-2 bg-white text-gray-600 hover:bg-gray-50 rounded-full text-xs font-bold transition-all border border-gray-200/50">
                                    2021
                                </button>
                                <button className="px-5 py-2 bg-white text-gray-600 hover:bg-gray-50 rounded-full text-xs font-bold transition-all border border-gray-200/50">
                                    Eldre
                                </button>
                            </div>
                        </div>
                        <button className="text-[#C5A66B] text-xs font-bold hover:underline">
                            Se tidslinje
                        </button>
                    </div>
                </div>

                {/* Featured Album */}
                {featuredAlbum && (
                    <Link href={`/events/${featuredAlbum.id}`} className="group relative w-full h-[500px] rounded-3xl overflow-hidden shadow-lg cursor-pointer">
                        {/* Background Image */}
                        <img
                            src={featuredAlbum.coverImage || "/placeholder-image.jpg"}
                            alt={featuredAlbum.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>

                        {/* Content */}
                        <div className="absolute bottom-0 left-0 p-10 flex flex-col gap-4 w-full">
                            <div className="flex items-center gap-3">
                                <span className="bg-[#B39459] text-white px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                                    NYLIG
                                </span>
                                <span className="flex items-center gap-1.5 text-white/80 text-xs font-bold bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                                    <span className="material-symbols-outlined text-[1rem]">photo_camera</span>
                                    {featuredAlbum.photoCount} bilder
                                </span>
                            </div>

                            <div className="flex flex-col gap-2">
                                <h2 className="text-4xl text-white font-bold tracking-tight group-hover:text-[#F5F2EA] transition-colors">
                                    {featuredAlbum.title}
                                </h2>
                                <div className="flex items-center gap-4 text-white/70 text-sm font-medium">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[1.1rem]">calendar_today</span>
                                        <span>
                                            {featuredAlbum.date.toLocaleDateString("no-NO", {
                                                day: "numeric",
                                                month: "long",
                                                year: "numeric",
                                            })}
                                        </span>
                                    </div>
                                    <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[1.1rem]">location_on</span>
                                        <span>{featuredAlbum.location || "Ukjent sted"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                )}

                {/* Album Grid */}
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-2 text-gray-800">
                        <span className="material-symbols-outlined text-[#C5A66B]">folder_open</span>
                        <h3 className="text-lg font-bold">Alle Album</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {gridAlbums.map((album) => (
                            <Link href={`/events/${album.id}`} key={album.id} className="group flex flex-col gap-4 cursor-pointer">
                                {/* Image Card */}
                                <div className="aspect-[16/10] w-full rounded-xl overflow-hidden relative shadow-sm">
                                    <img
                                        src={album.coverImage || "/placeholder-image.jpg"}
                                        alt={album.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>

                                    {/* Count Badge */}
                                    <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-white/10">
                                        <span className="material-symbols-outlined text-[0.9rem]">image</span>
                                        {album.photoCount}
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="flex flex-col gap-1 px-1">
                                    <h4 className="text-lg font-bold text-gray-900 group-hover:text-[#C5A66B] transition-colors leading-tight">
                                        {album.title}
                                    </h4>
                                    <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider">
                                        <span>
                                            {album.date.toLocaleDateString("no-NO", {
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </span>
                                        {album.location && <span>• {album.location}</span>}
                                    </div>
                                </div>
                            </Link>
                        ))}

                        {/* Show empty state if no albums */}
                        {albums.length === 0 && (
                            <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 text-gray-400">
                                <span className="material-symbols-outlined text-4xl">no_photography</span>
                                <p>Ingen album funnet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
