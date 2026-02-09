"use server";

import { db } from "@/server/db";
import { ensureMember } from "@/server/auth/ensureMember";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type CategoryWithCount = {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    _count: {
        posts: number;
    }
};

export async function getCategories() {
    try {
        const member = await ensureMember();
        if (member.role !== Role.ADMIN && member.role !== Role.MODERATOR) {
            throw new Error("Unauthorized");
        }

        // Fetch categories
        const categories = await db.category.findMany({
            orderBy: { name: 'asc' }
        });

        const counts = await db.post.groupBy({
            by: ['category'],
            _count: {
                _all: true
            }
        });

        const countMap = new Map<string, number>();
        // Fix TS error with explicit cast
        (counts as unknown as { category: string, _count: { _all: number } }[]).forEach(c => {
            if (c.category) countMap.set(c.category, c._count._all);
        });

        const data: CategoryWithCount[] = categories.map(c => ({
            ...c,
            _count: {
                posts: countMap.get(c.name) || 0
            }
        }));

        return { success: true, data };
    } catch (error) {
        console.error("Failed to get categories:", error);
        return { success: false, error: "Kunne ikke hente kategorier" };
    }
}

export async function createCategory(data: { name: string; description?: string }) {
    try {
        const member = await ensureMember();
        if (member.role !== Role.ADMIN) throw new Error("Unauthorized");

        if (!data.name) return { success: false, error: "Navn er påkrevd" };

        const existing = await db.category.findUnique({ where: { name: data.name } });
        if (existing) {
            return { success: false, error: "Kategorien finnes allerede" };
        }

        await db.category.create({
            data: {
                name: data.name,
                description: data.description
            }
        });

        revalidatePath("/admin/system/categories");
        return { success: true };
    } catch (error) {
        console.error("Failed to create category:", error);
        return { success: false, error: "Kunne ikke opprette kategori" };
    }
}

export async function updateCategory(id: string, data: { name: string; description?: string }) {
    try {
        const member = await ensureMember();
        if (member.role !== Role.ADMIN) throw new Error("Unauthorized");

        const category = await db.category.findUnique({ where: { id } });
        if (!category) return { success: false, error: "Fant ikke kategori" };

        // If name changes, we should update all posts with that category?
        // Yes, ensuring referential integrity manually since we use string.

        await db.$transaction(async (tx) => {
            // Update category
            await tx.category.update({
                where: { id },
                data: {
                    name: data.name,
                    description: data.description
                }
            });

            // Update posts if name changed
            if (data.name !== category.name) {
                await tx.post.updateMany({
                    where: { category: category.name },
                    data: { category: data.name }
                });
            }
        });

        revalidatePath("/admin/system/categories");
        return { success: true };

    } catch (error) {
        console.error("Failed to update category:", error);
        return { success: false, error: "Kunne ikke oppdatere kategori" };
    }
}

export async function deleteCategory(id: string) {
    try {
        const member = await ensureMember();
        if (member.role !== Role.ADMIN) throw new Error("Unauthorized");

        const category = await db.category.findUnique({ where: { id } });
        if (!category) return { success: false, error: "Fant ikke kategori" };

        // Check if used
        const count = await db.post.count({ where: { category: category.name } });
        if (count > 0) {
            return { success: false, error: `Kan ikke slette kategori som er i bruk av ${count} innlegg.` };
        }

        await db.category.delete({ where: { id } });

        revalidatePath("/admin/system/categories");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete category:", error);
        return { success: false, error: "Kunne ikke slette kategori" };
    }
}
