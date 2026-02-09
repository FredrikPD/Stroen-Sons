"use server";

import { db } from "@/server/db";
import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function getSystemSetting(key: string) {
    try {
        const setting = await db.systemSetting.findUnique({
            where: { key }
        });
        return setting?.value || null;
    } catch (error) {
        console.error(`Failed to get setting ${key}:`, error);
        return null;
    }
}

export async function updateSystemSetting(key: string, value: string) {
    try {
        await ensureRole([Role.ADMIN]);

        await db.systemSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value }
        });

        revalidatePath("/admin/system");
        revalidatePath("/admin/photos"); // Limit affects photos page
        return { success: true };
    } catch (error) {
        console.error(`Failed to update setting ${key}:`, error);
        return { success: false, error: "Kunne ikke oppdatere innstilling" };
    }
}

export async function getPhotoSettings() {
    try {
        const [maxSize, maxFiles] = await Promise.all([
            getSystemSetting("PHOTO_MAX_SIZE_MB"),
            getSystemSetting("PHOTO_MAX_FILES")
        ]);

        return {
            maxSizeMB: parseInt(maxSize || "8", 10),
            maxFiles: parseInt(maxFiles || "50", 10)
        };
    } catch {
        return { maxSizeMB: 8, maxFiles: 50 }; // Defaults
    }
}
