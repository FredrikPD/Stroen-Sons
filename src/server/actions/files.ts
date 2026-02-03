"use server";

import { UTApi } from "uploadthing/server";
import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";

const utapi = new UTApi();

export async function deleteFile(fileKey: string) {
    try {
        await utapi.deleteFiles(fileKey);
        return { success: true };
    } catch (error) {
        console.error("Failed to delete file:", error);
        return { success: false, error: "Failed to delete file" };
    }
}


export async function getRecentFiles(limit = 5) {
    const { userId } = await auth();
    if (!userId) return [];

    try {
        const files = await db.postAttachment.findMany({
            take: limit,
            orderBy: {
                createdAt: "desc",
            },
            include: {
                post: {
                    select: {
                        id: true,
                        title: true,
                    }
                }
            }
        });
        return files;
    } catch (error) {
        console.error("Failed to fetch recent files:", error);
        return [];
    }
}
