"use server";

import { db } from "@/server/db";

export type Album = {
    id: string;
    title: string;
    description: string | null;
    coverImage: string | null;
    location: string | null;
    photoCount: number;
    year: number;
    month: string;
    day: string;
    date: Date;
    attendees: {
        firstName: string | null;
        lastName: string | null;
        avatarUrl: string | null;
    }[];
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
            description: true,
            coverImage: true,
            startAt: true,
            location: true,
            attendees: {
                take: 3,
                select: {
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                }
            },
            _count: {
                select: {
                    photos: true,
                },
            },
        },
        orderBy: {
            startAt: "desc",
        }
    });

    // Transform to a cleaner shape
    return eventsWithPhotos.map((event: any) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        coverImage: event.coverImage,
        location: event.location,
        photoCount: event._count.photos,
        year: event.startAt.getFullYear(),
        month: event.startAt.toLocaleDateString("no-NO", { month: "short" }).toUpperCase(), // e.g. NOV
        day: event.startAt.getDate().toString().padStart(2, '0'),
        date: event.startAt,
        attendees: event.attendees ? event.attendees.map((a: any) => ({
            ...a,
            avatarUrl: a.avatarUrl ?? null
        })) : []
    }));
}

export type Photo = {
    id: string;
    url: string;
    caption: string | null;
    createdAt: Date;
    width?: number; // Optional, might not be in DB but useful for gallery if we had it
    height?: number;
};

export type AlbumDetails = {
    id: string;
    title: string;
    description: string | null;
    date: Date;
    day: string;
    month: string;
    year: number;
    location: string | null;
    photos: Photo[];
};

export async function getAlbumWithPhotos(id: string): Promise<AlbumDetails | null> {
    const event = await db.event.findUnique({
        where: { id },
        include: {
            photos: {
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!event) return null;

    return {
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.startAt,
        day: event.startAt.getDate().toString().padStart(2, '0'),
        month: event.startAt.toLocaleDateString("no-NO", { month: "short" }).toUpperCase(),
        year: event.startAt.getFullYear(),
        location: event.location,
        photos: (event as any).photos.map((p: any) => ({
            id: p.id,
            url: p.url,
            caption: p.caption,
            createdAt: p.createdAt
        }))
    };
}
