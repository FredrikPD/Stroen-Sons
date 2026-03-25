"use server";

import { db, ACTIVE_MEMBER_FILTER } from "@/server/db";

export async function getMembers() {
    try {
        const members = await db.member.findMany({
            where: { ...ACTIVE_MEMBER_FILTER },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                email: true,
                role: true,
                membershipType: true,
                createdAt: true,
                address: true,
                zipCode: true,
                city: true,
                phoneNumber: true,
            },
            orderBy: [
                { firstName: 'asc' },
                { lastName: 'asc' },
            ],
        });

        return { success: true, data: members };
    } catch (error) {
        console.error("Failed to fetch members:", error);
        return { success: false, error: "Kunne ikke hente medlemmer." };
    }
}
