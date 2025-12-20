"use server";

import { db } from "@/server/db";
import { PaymentCategory, RequestStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/server/actions/notifications";

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

        const safeRequests = requests.map((req: any) => ({
            ...req,
            transaction: req.transaction ? {
                ...req.transaction,
                amount: req.transaction.amount.toNumber()
            } : null
        }));

        return { success: true, requests: safeRequests };
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

export async function updateInvoiceGroup(oldTitle: string, data: {
    description?: string;
    amount?: number;
    dueDate?: Date;
}, memberIds?: string[]) {
    try {
        // Validation
        if (data.amount !== undefined && data.amount < 0) return { success: false, error: "Beløp kan ikke være negativt" };


        // 1. Fetch existing requests for this group to know state and usage as template
        const existingRequests = await db.paymentRequest.findMany({
            where: { title: oldTitle },
            select: { id: true, memberId: true, status: true, amount: true, description: true, dueDate: true, category: true, eventId: true }
        });

        if (existingRequests.length === 0) return { success: false, error: "Fant ingen fakturaer i denne gruppen." };

        // Template for new requests
        const template = existingRequests[0];

        // Determine finalized values for fields (New data > Old data)
        const finalAmount = data.amount !== undefined ? data.amount : template.amount;
        const finalDescription = data.description !== undefined ? data.description : template.description;
        const finalDueDate = data.dueDate !== undefined ? data.dueDate : template.dueDate;


        // 2. Handle Member Sync if memberIds provided
        if (memberIds) {
            const currentMemberIds = existingRequests.map(r => r.memberId);

            // A. Identify ADD (In new list, not in old)
            const toAdd = memberIds.filter(id => !currentMemberIds.includes(id));

            // B. Identify REMOVE (In old list, not in new)
            const toRemoveMemberIds = currentMemberIds.filter(id => !memberIds.includes(id));

            // Perform Adds
            if (toAdd.length > 0) {
                // Determine category string for notification
                const categoryLabel = template.category === 'MEMBERSHIP_FEE' ? 'Medlemskontingent' : 'Faktura';

                // Batch create requests
                await db.paymentRequest.createMany({
                    data: toAdd.map(mId => ({
                        title: oldTitle, // Keep same title to stay in group
                        memberId: mId,
                        amount: finalAmount,
                        description: finalDescription,
                        dueDate: finalDueDate,
                        category: template.category,
                        eventId: template.eventId,
                        status: RequestStatus.PENDING
                    }))
                });

                // Notify new members
                // We do this in a loop or Promise.all because createNotification is per-user
                // Or we can createMany notifications if we had a helper, but looping createNotification is safe enough for small batches
                await Promise.all(toAdd.map(async (mId) => {
                    await createNotification({
                        memberId: mId,
                        type: "INVOICE_CREATED",
                        title: `Ny betalingsforespørsel: ${oldTitle}`,
                        message: `Du har mottatt en ny forespørsel på ${finalAmount} kr.`,
                        link: "/dashboard" // Or specific invoice page if we had one for members
                    });
                }));
            }

            // Perform Removes (Only DELETE if NOT PAID)
            const requestsToRemove = existingRequests.filter(r => toRemoveMemberIds.includes(r.memberId));
            const safeToRemoveIds = requestsToRemove.filter(r => r.status !== 'PAID').map(r => r.id);

            if (safeToRemoveIds.length > 0) {
                await db.paymentRequest.deleteMany({
                    where: { id: { in: safeToRemoveIds } }
                });
            }
        }

        // 3. Update ALL remaining requests with new details (if changed)
        const updateData: any = {};
        if (data.description !== undefined) updateData.description = data.description;
        if (data.amount !== undefined) updateData.amount = data.amount;
        if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;

        if (Object.keys(updateData).length > 0) {
            await db.paymentRequest.updateMany({
                where: { title: oldTitle },
                data: updateData
            });
        }

        revalidatePath("/admin/finance/invoices");
        revalidatePath(`/admin/finance/invoices/${encodeURIComponent(oldTitle)}`); // Revalidate specific page

        return { success: true };
    } catch (error) {
        console.error("Failed to update invoice group:", error);
        return { success: false, error: "Kunne ikke oppdatere fakturagrupppen" };
    }
}
