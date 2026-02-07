"use server";

import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { UTApi } from "uploadthing/server";
import { Event, Photo } from "@prisma/client";

export type EventWithCount = Event & {
    _count: {
        photos: number;
    }
};

export type PhotoWithEvent = Photo & {
    event: {
        title: string;
    }
};

// Initialize UTApi lazily to avoid build-time env checks
const getUtapi = () => new UTApi();

/**
 * Fetch recent events for the upload dropdown.
 * Includes photo count for stats.
 */
export async function getRecentEvents(): Promise<EventWithCount[]> {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const member = await db.member.findUnique({
        where: { clerkId: userId },
        select: { role: true },
    });

    if (member?.role !== "ADMIN") throw new Error("Unauthorized");

    const events = await db.event.findMany({
        orderBy: { startAt: "desc" },
        take: 50,
        select: {
            id: true,
            title: true,
            startAt: true,
            _count: {
                select: { photos: true }
            }
        }
    });

    return events as unknown as EventWithCount[];
}

/**
 * Fetch photos, optionally filtered by eventId.
 */
export async function getRecentPhotos(eventId?: string): Promise<PhotoWithEvent[]> {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const member = await db.member.findUnique({
        where: { clerkId: userId },
        select: { role: true },
    });

    if (member?.role !== "ADMIN") throw new Error("Unauthorized");

    const whereClause = eventId ? { eventId } : {};

    const photos = await db.photo.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: {
            event: {
                select: { title: true },
            },
        },
        take: eventId ? undefined : 100, // No limit if filtering by event, otherwise cap recent
    });

    return photos as unknown as PhotoWithEvent[];
}

/**
 * Delete a single photo from DB and UploadThing
 */
export async function deletePhoto(photoId: string) {
    return deletePhotos([photoId]);
}

/**
 * Bulk delete photos
 */
export async function deletePhotos(photoIds: string[]) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const member = await db.member.findUnique({
        where: { clerkId: userId },
        select: { role: true },
    });

    if (member?.role !== "ADMIN") throw new Error("Unauthorized");

    // Fetch photos to get file keys
    const photos = await db.photo.findMany({
        where: { id: { in: photoIds } },
        select: { id: true, url: true }
    });

    if (photos.length === 0) return { success: true };

    const fileKeys = photos
        .map(p => p.url.split("/").pop())
        .filter((key): key is string => !!key);

    if (fileKeys.length > 0) {
        await getUtapi().deleteFiles(fileKeys);
    }

    await db.photo.deleteMany({
        where: { id: { in: photoIds } },
    });

    return { success: true };
}

/**
 * Get storage usage stats from UploadThing
 */
export async function getStorageStats() {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const member = await db.member.findUnique({
        where: { clerkId: userId },
        select: { role: true },
    });

    if (member?.role !== "ADMIN") throw new Error("Unauthorized");

    try {
        const usage = await getUtapi().getUsageInfo();
        return {
            totalBytes: usage.totalBytes,
            appTotalBytes: usage.appTotalBytes,
            filesUploaded: usage.filesUploaded,
            limitBytes: usage.limitBytes,
        };
    } catch (error) {
        console.error("Failed to fetch storage stats:", error);
        return null;
    }
}
