"use server";

import { db } from "@/server/db";
import { ensureMember } from "@/server/auth/ensureMember";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type EventCategoryWithCount = {
    id: string;
    name: string;
    description: string | null;
    color: string;
    createdAt: Date;
    _count: {
        events: number;
    }
};

export async function getEventCategories() {
    try {
        const member = await ensureMember();
        if (member.role !== Role.ADMIN && member.role !== Role.MODERATOR) {
            throw new Error("Unauthorized");
        }

        const categories = await db.eventCategory.findMany({
            orderBy: { name: 'asc' }
        });

        // Count events per category
        const counts = await db.event.groupBy({
            by: ['category'],
            _count: { _all: true }
        });

        const countMap = new Map<string, number>();
        (counts as unknown as { category: string | null, _count: { _all: number } }[]).forEach(c => {
            if (c.category) countMap.set(c.category, c._count._all);
        });

        const data: EventCategoryWithCount[] = categories.map(c => ({
            ...c,
            _count: {
                events: countMap.get(c.name) || 0
            }
        }));

        return { success: true, data };
    } catch (error) {
        console.error("Failed to get event categories:", error);
        return { success: false, error: "Kunne ikke hente kategorier" };
    }
}

export async function createEventCategory(data: { name: string; description?: string; color?: string }) {
    try {
        const member = await ensureMember();
        if (member.role !== Role.ADMIN) throw new Error("Unauthorized");

        if (!data.name) return { success: false, error: "Navn er påkrevd" };

        const existing = await db.eventCategory.findUnique({ where: { name: data.name } });
        if (existing) {
            return { success: false, error: "Kategorien finnes allerede" };
        }

        await db.eventCategory.create({
            data: {
                name: data.name,
                description: data.description,
                color: data.color || "blue"
            }
        });

        revalidatePath("/admin/system/event-categories");
        return { success: true };
    } catch (error) {
        console.error("Failed to create event category:", error);
        return { success: false, error: "Kunne ikke opprette kategori" };
    }
}

export async function updateEventCategory(id: string, data: { name: string; description?: string; color?: string }) {
    try {
        const member = await ensureMember();
        if (member.role !== Role.ADMIN) throw new Error("Unauthorized");

        const category = await db.eventCategory.findUnique({ where: { id } });
        if (!category) return { success: false, error: "Fant ikke kategori" };

        await db.$transaction(async (tx) => {
            await tx.eventCategory.update({
                where: { id },
                data: {
                    name: data.name,
                    description: data.description,
                    color: data.color
                }
            });

            // Update events if name changed
            if (data.name !== category.name) {
                await tx.event.updateMany({
                    where: { category: category.name },
                    data: { category: data.name }
                });
            }
        });

        revalidatePath("/admin/system/event-categories");
        return { success: true };
    } catch (error) {
        console.error("Failed to update event category:", error);
        return { success: false, error: "Kunne ikke oppdatere kategori" };
    }
}

export async function deleteEventCategory(id: string) {
    try {
        const member = await ensureMember();
        if (member.role !== Role.ADMIN) throw new Error("Unauthorized");

        const category = await db.eventCategory.findUnique({ where: { id } });
        if (!category) return { success: false, error: "Fant ikke kategori" };

        const count = await db.event.count({ where: { category: category.name } });
        if (count > 0) {
            return { success: false, error: `Kan ikke slette kategori som er i bruk av ${count} arrangementer.` };
        }

        await db.eventCategory.delete({ where: { id } });

        revalidatePath("/admin/system/event-categories");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete event category:", error);
        return { success: false, error: "Kunne ikke slette kategori" };
    }
}
