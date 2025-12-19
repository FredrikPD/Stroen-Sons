"use server";

import { db } from "@/server/db";
import { PaymentCategory, RequestStatus } from "@prisma/client";

export async function getInvoiceGroups() {
    try {
        const requests = await db.paymentRequest.findMany({
            where: {
                category: { not: PaymentCategory.MEMBERSHIP_FEE } // Separate section for non-monthly fees
            },
            include: {
                member: { select: { id: true, firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Group by Title (e.g. "Hytte tur 2025")
        const groups: Record<string, {
            title: string;
            category: PaymentCategory;
            createdAt: Date;
            totalAmount: number;
            paidCount: number;
            totalCount: number;
            requests: typeof requests;
        }> = {};

        for (const req of requests) {
            if (!groups[req.title]) {
                groups[req.title] = {
                    title: req.title,
                    category: req.category,
                    createdAt: req.createdAt,
                    totalAmount: 0,
                    paidCount: 0,
                    totalCount: 0,
                    requests: []
                };
            }
            const g = groups[req.title];
            g.totalAmount += req.amount;
            g.totalCount++;
            if (req.status === 'PAID') g.paidCount++;
            g.requests.push(req);
        }


        return { success: true, groups: Object.values(groups) };

    } catch (error) {
        console.error("Failed to fetch invoice groups:", error);
        return { success: false, error: "Kunne ikke hente fakturaer" };
    }
}


export async function getInvoiceGroupDetails(title: string) {
    try {
        const requests = await db.paymentRequest.findMany({
            where: { title: title }, // Title is exact match
            include: {
                member: { select: { id: true, firstName: true, lastName: true } },
                transaction: true // To see when it was paid
            },
            orderBy: { member: { firstName: 'asc' } }
        });

        return { success: true, requests };
    } catch (error) {
        console.error("Failed to fetch invoice details:", error);
        return { success: false, error: "Kunne ikke hente fakturadetaljer" };
    }
}

export async function getInvoiceFormData() {
    const [members, events] = await Promise.all([
        db.member.findMany({
            orderBy: { firstName: 'asc' },
            select: { id: true, firstName: true, lastName: true }
        }),
        db.event.findMany({
            where: {
                startAt: { gte: new Date() }
            },
            orderBy: { startAt: 'asc' },
            select: {
                id: true,
                title: true,
                startAt: true,
                attendees: { select: { id: true } }
            }
        })
    ]);
    return { members, events };
}
