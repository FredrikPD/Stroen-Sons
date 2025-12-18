"use server";

import { db } from "@/server/db";

export type Album = {
    id: string;
    title: string;
    coverImage: string | null;
    location: string | null;
    photoCount: number;
    year: number;
    date: Date;
};

export async function getAlbums(): Promise<Album[]> {
    const eventsWithPhotos = await db.event.findMany({
        where: {
            photos: {
                some: {}, // Only events with photos
            },
        },
        select: {
            id: true,
            title: true,
            coverImage: true,
            startAt: true,
            location: true,
            _count: {
                select: {
                    photos: true,
                },
            },
        },
        orderBy: {
            startAt: "desc",
        },
        cacheStrategy: { ttl: 60, swr: 60 }
    });

    // Transform to a cleaner shape
    return eventsWithPhotos.map((event) => ({
        id: event.id,
        title: event.title,
        coverImage: event.coverImage,
        location: event.location,
        photoCount: (event as any)._count.photos,
        year: event.startAt.getFullYear(),
        date: event.startAt,
    }));
}
