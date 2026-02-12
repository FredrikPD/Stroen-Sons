"use server";

import { db } from "@/server/db";
import { PaymentCategory, RequestStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/server/actions/notifications";
import { ensureMember } from "@/server/auth/ensureMember";

const roundToTwo = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;

const formatNok = (amount: number) =>
    new Intl.NumberFormat("nb-NO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);

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
        const normalizedAmount = roundToTwo(data.amount);
        if (!Number.isFinite(normalizedAmount) || normalizedAmount < 0) {
            return { success: false, error: "Beløp må være et gyldig tall på minst 0,00" };
        }

        const request = await db.paymentRequest.create({
            data: {
                ...data,
                amount: normalizedAmount,
                status: RequestStatus.PENDING,
            },
        });

        // Notify member
        const categoryLabel = data.category === 'MEMBERSHIP_FEE' ? 'Medlemskontingent' : 'Faktura';
        await createNotification({
            memberId: data.memberId,
            type: "INVOICE_CREATED",
            title: `Ny ${categoryLabel}: ${data.title}`,
            message: `Du har mottatt et krav på ${formatNok(normalizedAmount)} kr.`,
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
        const normalizedAmount = roundToTwo(data.amount);
        if (!Number.isFinite(normalizedAmount) || normalizedAmount < 0) {
            return { success: false, error: "Beløp må være et gyldig tall på minst 0,00" };
        }

        const batchCreatedAt = new Date();
        const requests = data.memberIds.map((memberId) => ({
            title: data.title,
            description: data.description,
            amount: normalizedAmount,
            dueDate: data.dueDate,
            memberId: memberId,
            category: data.category,
            eventId: data.eventId,
            status: RequestStatus.PENDING,
            createdAt: batchCreatedAt,
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
                message: `Du har mottatt et krav på ${formatNok(normalizedAmount)} kr.`,
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

        const requestAmount = roundToTwo(Number(request.amount));

        // 2. Transactionally update status, create Transaction, AND update Member Balance
        await db.$transaction(async (tx) => {
            // Create the official Accounting Transaction
            const transaction = await tx.transaction.create({
                data: {
                    amount: requestAmount,
                    description: request.title,
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
                        increment: requestAmount
                    }
                }
            });

            // If this is a membership fee, update the Payment record for status checks
            if (request.category === 'MEMBERSHIP_FEE') {
                const date = request.dueDate || new Date();
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const period = `${year}-${month}`;

                await tx.payment.upsert({
                    where: {
                        memberId_period: {
                            memberId: request.memberId,
                            period: period
                        }
                    },
                    update: {
                        status: "PAID",
                        paidAt: new Date(),
                        amount: Math.round(requestAmount)
                    },
                    create: {
                        memberId: request.memberId,
                        period: period,
                        status: "PAID",
                        paidAt: new Date(),
                        amount: Math.round(requestAmount)
                    }
                });
            }
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
        return {
            success: true,
            data: requests.map((request) => ({
                ...request,
                amount: Number(request.amount)
            }))
        };
    } catch {
        return { success: false, error: "Failed to fetch requests" };
    }
}

/**
 * Fetch all pending requests for admin view
 */
export async function getAllPendingRequests() {
    const requests = await db.paymentRequest.findMany({
        where: { status: "PENDING" },
        include: { member: true },
        orderBy: { dueDate: 'asc' } // Oldest due first
    });
    return requests.map((request) => ({
        ...request,
        amount: Number(request.amount)
    }));
}

/**
 * Delete a pending payment request
 */
export async function deletePaymentRequest(requestId: string) {
    try {
        const request = await db.paymentRequest.findUnique({
            where: { id: requestId }
        });

        if (!request) {
            return { success: false, error: "Forespørselen ble ikke funnet." };
        }

        if (request.status === "PAID") {
            return { success: false, error: "Du kan ikke slette en betalt forespørsel." };
        }

        await db.paymentRequest.delete({
            where: { id: requestId }
        });

        revalidatePath("/admin/finance/invoices");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete request:", error);
        return { success: false, error: "Kunne ikke slette forespørselen." };
    }
}

/**
 * Get a single payment request by ID
 */
export async function getPaymentRequest(requestId: string) {
    try {
        const member = await ensureMember();

        const request = await db.paymentRequest.findUnique({
            where: { id: requestId },
            include: { member: true }
        });

        if (!request) {
            return { success: false, error: "Faktura ikke funnet" };
        }

        // Auth check: User must be the owner OR an admin
        if (request.memberId !== member.id && member.role !== "ADMIN") {
            return { success: false, error: "Du har ikke tilgang til denne fakturaen" };
        }

        return {
            success: true,
            data: {
                ...request,
                amount: Number(request.amount)
            }
        };
    } catch (error) {
        console.error("Failed to fetch request:", error);
        return { success: false, error: "Kunne ikke hente faktura" };
    }
}
