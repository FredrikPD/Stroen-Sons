"use server";

import { db } from "@/server/db";
import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type MembershipTypeWithCount = {
    id: string;
    name: string;
    description: string | null;
    fee: number;
    createdAt: Date;
    updatedAt: Date;
    _count: {
        members: number; // We need to calculate this manually since relation is loose
    };
};

export async function getMembershipTypes() {
    try {
        await ensureRole([Role.ADMIN]);

        const types = await db.membershipType.findMany({
            orderBy: { name: 'asc' }
        });

        // Calculate member counts for each type (since it's a string field on Member, not a Relation)
        // Group by membershipType to get counts efficiently
        const memberCounts = await db.member.groupBy({
            by: ['membershipType'],
            _count: {
                _all: true
            }
        });

        const countMap = new Map<string, number>();
        (memberCounts as unknown as { membershipType: string, _count: { _all: number } }[]).forEach(c => {
            if (c.membershipType) countMap.set(c.membershipType, c._count._all);
        });

        const typesWithCount = types.map(t => ({
            ...t,
            _count: {
                members: countMap.get(t.name) || 0
            }
        }));

        return { success: true, data: typesWithCount };
    } catch (error) {
        console.error("Failed to fetch membership types:", error);
        return { success: false, error: "Kunne ikke hente medlemstyper." };
    }
}

export async function createMembershipType(data: { name: string; description?: string; fee: number }) {
    try {
        await ensureRole([Role.ADMIN]);

        // Unique name check
        const existing = await db.membershipType.findUnique({
            where: { name: data.name }
        });

        if (existing) {
            return { success: false, error: "En medlemstype med dette navnet finnes allerede." };
        }

        await db.membershipType.create({
            data: {
                name: data.name,
                description: data.description,
                fee: data.fee
            }
        });

        revalidatePath("/admin/system/membership-types");
        return { success: true };
    } catch (error) {
        console.error("Failed to create membership type:", error);
        return { success: false, error: "Kunne ikke opprette medlemstype." };
    }
}

export async function updateMembershipType(id: string, data: { name: string; description?: string; fee: number }) {
    try {
        await ensureRole([Role.ADMIN]);

        const current = await db.membershipType.findUnique({ where: { id } });
        if (!current) return { success: false, error: "Fant ikke medlemstype." };

        // If name changes, we must update all members with this type string
        const nameChanged = current.name !== data.name;

        if (nameChanged) {
            // Check if new name exists
            const existingName = await db.membershipType.findUnique({ where: { name: data.name } });
            if (existingName) return { success: false, error: "Navnet er allerede i bruk." };
        }

        await db.$transaction(async (tx) => {
            await tx.membershipType.update({
                where: { id },
                data: {
                    name: data.name,
                    description: data.description,
                    fee: data.fee
                }
            });

            if (nameChanged) {
                await tx.member.updateMany({
                    where: { membershipType: current.name },
                    data: { membershipType: data.name }
                });
            }
        });

        revalidatePath("/admin/system/membership-types");
        return { success: true };
    } catch (error) {
        console.error("Failed to update membership type:", error);
        return { success: false, error: "Kunne ikke oppdatere medlemstype." };
    }
}

export async function deleteMembershipType(id: string) {
    try {
        await ensureRole([Role.ADMIN]);

        const type = await db.membershipType.findUnique({ where: { id } });
        if (!type) return { success: false, error: "Fant ikke medlemstype." };

        // Check for usage
        const usageCount = await db.member.count({
            where: { membershipType: type.name }
        });

        if (usageCount > 0) {
            return {
                success: false,
                error: `Kan ikke slette medlemstypen fordi ${usageCount} medlemmer bruker den. Endre disses medlemstype først.`
            };
        }

        await db.membershipType.delete({ where: { id } });

        revalidatePath("/admin/system/membership-types");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete membership type:", error);
        return { success: false, error: "Kunne ikke slette medlemstype." };
    }
}

// Initial Seeding Helper (Run once via UI or script if needed, or check on load)
// Initial Seeding Helper (Run once via UI or script if needed, or check on load)
export async function seedDefaultTypes(shouldRevalidate = true) {
    try {
        await ensureRole([Role.ADMIN]);

        const defaults = [
            { name: "STANDARD", description: "Vanlig medlem", fee: 750 },
            { name: "HONORARY", description: "Æresmedlem", fee: 0 },
            { name: "SUPPORT", description: "Støttemedlem", fee: 100 },
            { name: "TRIAL", description: "Prøvemedlem", fee: 750 }, // As discussed
        ];

        let created = 0;
        for (const t of defaults) {
            const exists = await db.membershipType.findUnique({ where: { name: t.name } });
            if (!exists) {
                await db.membershipType.create({ data: t });
                created++;
            }
        }

        if (shouldRevalidate) {
            revalidatePath("/admin/system/membership-types");
        }
        return { success: true, message: `Created ${created} default types.` };

    } catch (error) {
        console.error("Failed to seed:", error);
        return { success: false, error: "Failed to seed." };
    }
}
