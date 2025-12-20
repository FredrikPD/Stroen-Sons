"use server";

import { db } from "@/server/db";
import { PaymentCategory, RequestStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/server/actions/notifications";

/**
 * Create a single payment request for a member.
 */
export async function createPaymentRequest(data: {
    title: string;
    description?: string;
    amount: number;
    dueDate?: Date;
    memberId: string;
    category: PaymentCategory;
    eventId?: string;
}) {
    try {
        const request = await db.paymentRequest.create({
            data: {
                ...data,
                status: RequestStatus.PENDING,
            },
        });

        // Notify member
        const categoryLabel = data.category === 'MEMBERSHIP_FEE' ? 'Medlemskontingent' : 'Faktura';
        await createNotification({
            memberId: data.memberId,
            type: "INVOICE_CREATED",
            title: `Ny ${categoryLabel}: ${data.title}`,
            message: `Du har mottatt et krav på ${data.amount} kr.`,
            link: "/dashboard"
        });

        revalidatePath("/admin/finance/income");
        revalidatePath(`/member/${data.memberId}`); // Assuming member dashboard path
        return { success: true, request };
    } catch (error) {
        console.error("Failed to create payment request:", error);
        return { success: false, error: "Failed to create payment request" };
    }
}

/**
 * Create bulk payment requests (e.g. for all active members or event attendees).
 */
export async function createBulkPaymentRequests(data: {
    title: string;
    description?: string;
    amount: number;
    dueDate?: Date;
    memberIds: string[];
    category: PaymentCategory;
    eventId?: string;
}) {
    try {
        const requests = data.memberIds.map((memberId) => ({
            title: data.title,
            description: data.description,
            amount: data.amount,
            dueDate: data.dueDate,
            memberId: memberId,
            category: data.category,
            eventId: data.eventId,
            status: RequestStatus.PENDING,
        }));

        await db.paymentRequest.createMany({
            data: requests,
        });

        // Notify all members
        const categoryLabel = data.category === 'MEMBERSHIP_FEE' ? 'Medlemskontingent' : 'Faktura';

        await Promise.all(data.memberIds.map(async (memberId) => {
            await createNotification({
                memberId: memberId,
                type: "INVOICE_CREATED",
                title: `Ny ${categoryLabel}: ${data.title}`,
                message: `Du har mottatt et krav på ${data.amount} kr.`,
                link: "/dashboard"
            });
        }));

        revalidatePath("/admin/finance/income");
        return { success: true, count: requests.length };
    } catch (error) {
        console.error("Failed to create bulk requests:", error);
        return { success: false, error: "Failed to create bulk requests" };
    }
}

/**
 * Mark a payment request as PAID.
 * THIS IS CRITICAL: It also creates a Transaction record to officially log the income.
 */
export async function markRequestAsPaid(requestId: string) {
    try {
        // 1. Fetch the request to get details
        const request = await db.paymentRequest.findUnique({
            where: { id: requestId },
            include: { member: true },
        });

        if (!request) {
            throw new Error("Payment request not found");
        }

        if (request.status === "PAID") {
            return { success: false, error: "Already paid" };
        }

        // 2. Transactionally update status, create Transaction, AND update Member Balance
        await db.$transaction(async (tx) => {
            // Create the official Accounting Transaction
            const transaction = await tx.transaction.create({
                data: {
                    amount: request.amount,
                    description: `Payment for: ${request.title}`,
                    category: request.category.toString(),
                    date: new Date(),
                    memberId: request.memberId,
                    eventId: request.eventId,
                    paymentRequest: {
                        connect: { id: request.id }
                    }
                }
            });

            // Update the Request
            await tx.paymentRequest.update({
                where: { id: requestId },
                data: {
                    status: RequestStatus.PAID,
                    transactionId: transaction.id
                }
            });

            // Update Member Balance (Increment because they paid money IN)
            await tx.member.update({
                where: { id: request.memberId },
                data: {
                    balance: {
                        increment: request.amount
                    }
                }
            });
        });

        revalidatePath("/admin/finance/income");
        return { success: true };
    } catch (error) {
        console.error("Failed to mark as paid:", error);
        return { success: false, error: "Failed to create transaction" };
    }
}


/**
 * Get all payment requests for a member
 */
export async function getMemberPaymentRequests(memberId: string) {
    try {
        const requests = await db.paymentRequest.findMany({
            where: { memberId },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, data: requests };
    } catch (error) {
        return { success: false, error: "Failed to fetch requests" };
    }
}

/**
 * Fetch all pending requests for admin view
 */
export async function getAllPendingRequests() {
    return await db.paymentRequest.findMany({
        where: { status: "PENDING" },
        include: { member: true },
        orderBy: { dueDate: 'asc' } // Oldest due first
    });
}
