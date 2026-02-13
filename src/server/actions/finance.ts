"use server";

import { prisma } from "@/server/db";
import { ensureMember } from "@/server/auth/ensureMember";
import { revalidatePath } from "next/cache";
import { PaymentCategory, RequestStatus, Prisma } from "@prisma/client";
import { markRequestAsPaid } from "./payment-requests";
import { createManyNotifications, createNotification } from "@/server/actions/notifications";

// Helper to format consistent titles
const getFeeTitle = (year: number, month: number) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `Medlemskontingent ${year}-${pad(month)}`;
};

const getMonthEndDate = (year: number, month: number) => new Date(year, month, 0);

const EXPENSE_SPLIT_SUFFIX = " (Splittet)";

const normalizeExpenseDescription = (description: string) => {
    const trimmed = description.trim();
    if (trimmed.endsWith(EXPENSE_SPLIT_SUFFIX)) {
        return trimmed.slice(0, -EXPENSE_SPLIT_SUFFIX.length).trim();
    }
    return trimmed;
};

const roundToTwoDecimals = (value: number) =>
    Math.round((value + Number.EPSILON) * 100) / 100;

const formatNok = (amount: number) =>
    new Intl.NumberFormat("nb-NO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);

const splitAmountIntoShares = (totalAmount: number, count: number) => {
    if (count <= 0) return [];
    const totalCents = Math.round(totalAmount * 100);
    const baseCents = Math.floor(totalCents / count);
    const remainder = totalCents - (baseCents * count);
    return Array.from({ length: count }, (_, i) => (baseCents + (i < remainder ? 1 : 0)) / 100);
};

/**
 * Generate (or ensure existence of) monthly fee requests for all active members.
 */
// ... (previous imports)

export async function generateMonthlyFees(year: number, month: number) {
    try {
        const member = await ensureMember();
        if (member.role !== 'ADMIN') return { success: false, error: "Unauthorized" };

        const title = getFeeTitle(year, month);
        const dueDate = getMonthEndDate(year, month); // Due date is end of month

        // 1. Get all active members
        const members = await prisma.member.findMany({
            where: {
                // Add logic for active members if "status" exists, otherwise all
            }
        });

        // 2. Create requests if they don't exist
        const existingRequests = await prisma.paymentRequest.findMany({
            where: {
                title,
                category: PaymentCategory.MEMBERSHIP_FEE
            },
            select: { memberId: true }
        });

        const existingMemberIds = new Set(existingRequests.map(r => r.memberId));

        // Fetch dynamic fees
        const membershipTypes = await prisma.membershipType.findMany();
        const feeMap = new Map<string, number>();
        membershipTypes.forEach(t => feeMap.set(t.name, t.fee));

        const newRequests = members
            .filter(m => !existingMemberIds.has(m.id))
            .map(m => {
                // Default to 750 if type not found (fallback)
                const amount = feeMap.get(m.membershipType) ?? 750;
                return {
                    title,
                    description: `Månedlig kontingent for ${month}/${year}`,
                    amount,
                    dueDate,
                    memberId: m.id,
                    category: PaymentCategory.MEMBERSHIP_FEE,
                    status: RequestStatus.PENDING
                };
            });

        if (newRequests.length > 0) {
            await prisma.paymentRequest.createMany({
                data: newRequests
            });

            await createManyNotifications(newRequests.map((req) => ({
                memberId: req.memberId,
                type: "INVOICE_CREATED" as const,
                title: `${req.title}`,
                message: `Din faktura for ${month}/${year} er nå tilgjengelig. Beløp: ${formatNok(Number(req.amount))} kr.`,
                link: "/invoices"
            })));
        }

        revalidatePath("/admin/finance/income");
        return { success: true, count: newRequests.length };

    } catch (error) {
        console.error("Failed to generate fees:", error);
        return { success: false, error: "Failed to generate fees" };
    }
}

/**
 * Delete all monthly fee requests for a specific month.
 * Fails if ANY request is already PAID.
 */
export async function deleteMonthlyFees(year: number, month: number) {
    try {
        const member = await ensureMember();
        if (member.role !== 'ADMIN') return { success: false, error: "Unauthorized" };

        const title = getFeeTitle(year, month);

        // Check if any are paid
        const paidCount = await prisma.paymentRequest.count({
            where: {
                title,
                category: PaymentCategory.MEMBERSHIP_FEE,
                status: RequestStatus.PAID
            }
        });

        if (paidCount > 0) {
            return { success: false, error: "Kan ikke slette krav. Noen medlemmer har allerede betalt." };
        }

        // Safe to delete
        const result = await prisma.paymentRequest.deleteMany({
            where: {
                title,
                category: PaymentCategory.MEMBERSHIP_FEE
            }
        });

        // ... existing code ...
        return { success: true, count: result.count };

    } catch (error) {
        console.error("Failed to delete fees:", error);
        return { success: false, error: "Kunne ikke slette krav" };
    }
}

/**
 * Mark ALL monthly fee requests for a specific month as PAID.
 * Skips already PAID requests.
 */
export async function markMonthlyFeesAsPaid(year: number, month: number) {
    try {
        const member = await ensureMember();
        if (member.role !== 'ADMIN') return { success: false, error: "Unauthorized" };

        const title = getFeeTitle(year, month);

        // 1. Get all PENDING requests for this month
        const pendingRequests = await prisma.paymentRequest.findMany({
            where: {
                title,
                category: PaymentCategory.MEMBERSHIP_FEE,
                status: RequestStatus.PENDING
            },
            include: { member: true }
        });

        if (pendingRequests.length === 0) {
            return { success: true, count: 0, message: "Ingen ubetalte krav funnet." };
        }

        // 2. Process each request in its own transaction
        // This avoids "Transaction API error: A query cannot be executed on an expired transaction"
        // when processing many members.
        const date = new Date();
        const period = `${year}-${String(month).padStart(2, '0')}`;
        const depositNotifications: Array<{
            memberId: string;
            type: "BALANCE_DEPOSIT";
            title: string;
            message: string;
            link: string;
        }> = [];

        // We process sequentially to avoid connection pool exhaustion if there are hundreds of members,
        // though Promise.all with concurrency limit could be faster. For now, safety first.
        for (const req of pendingRequests) {
            await prisma.$transaction(async (tx) => {
                // Create Transaction
                const transaction = await tx.transaction.create({
                    data: {
                        amount: req.amount,
                        description: req.title,
                        category: req.category.toString(),
                        date: date,
                        memberId: req.memberId,
                        // eventId: req.eventId, // Usually null for fees
                        paymentRequest: {
                            connect: { id: req.id }
                        }
                    }
                });

                // Update Request
                await tx.paymentRequest.update({
                    where: { id: req.id },
                    data: {
                        status: RequestStatus.PAID,
                        transactionId: transaction.id
                    }
                });

                // Update Member Balance
                await tx.member.update({
                    where: { id: req.memberId },
                    data: {
                        balance: {
                            increment: req.amount
                        }
                    }
                });

                // Update Payment Record (Simplified View)
                const paymentAmountInt = Math.round(Number(req.amount));
                await tx.payment.upsert({
                    where: {
                        memberId_period: {
                            memberId: req.memberId,
                            period: period
                        }
                    },
                    update: {
                        status: "PAID",
                        paidAt: date,
                        amount: paymentAmountInt
                    },
                    create: {
                        memberId: req.memberId,
                        period: period,
                        status: "PAID",
                        paidAt: date,
                        amount: paymentAmountInt
                    }
                });
            });

            depositNotifications.push({
                memberId: req.memberId,
                type: "BALANCE_DEPOSIT",
                title: "Innbetaling registrert",
                message: `Vi har registrert en innbetaling på ${formatNok(Number(req.amount))} kr for "${req.title}".`,
                link: "/balance"
            });
        }

        await createManyNotifications(depositNotifications);

        revalidatePath("/admin/finance/income");
        return { success: true, count: pendingRequests.length };

    } catch (error) {
        console.error("Failed to mark all as paid:", error);
        return { success: false, error: "Kunne ikke oppdatere betalinger" };
    }
}

/**
 * Mark ALL monthly fee requests for a specific month as UNPAID.
 * Skips already PENDING requests.
 */
export async function markMonthlyFeesAsUnpaid(year: number, month: number) {
    try {
        const member = await ensureMember();
        if (member.role !== 'ADMIN') return { success: false, error: "Unauthorized" };

        const title = getFeeTitle(year, month);
        const period = `${year}-${String(month).padStart(2, '0')}`;

        const paidRequests = await prisma.paymentRequest.findMany({
            where: {
                title,
                category: PaymentCategory.MEMBERSHIP_FEE,
                status: RequestStatus.PAID
            },
            select: {
                id: true,
                memberId: true,
                amount: true,
                transactionId: true
            }
        });

        if (paidRequests.length === 0) {
            return { success: true, count: 0, message: "Ingen betalte krav funnet." };
        }

        for (const req of paidRequests) {
            await prisma.$transaction(async (tx) => {
                if (req.transactionId) {
                    await tx.transaction.delete({
                        where: { id: req.transactionId }
                    });
                }

                await tx.paymentRequest.update({
                    where: { id: req.id },
                    data: {
                        status: RequestStatus.PENDING,
                        transactionId: null
                    }
                });

                await tx.member.update({
                    where: { id: req.memberId },
                    data: {
                        balance: {
                            decrement: req.amount
                        }
                    }
                });

                await tx.payment.updateMany({
                    where: {
                        memberId: req.memberId,
                        period
                    },
                    data: {
                        status: "UNPAID",
                        amount: null,
                        paidAt: null
                    }
                });
            });
        }

        revalidatePath("/admin/finance");
        revalidatePath("/admin/finance/income");
        return { success: true, count: paidRequests.length };
    } catch (error) {
        console.error("Failed to mark all as unpaid:", error);
        return { success: false, error: "Kunne ikke oppdatere betalinger" };
    }
}

/**
 * Delete a single payment request.
 * Can delete even if paid (void transaction logic might be needed, but usually we just block paid for safety unless explicit void action).
 * For now: Block deletion if PAID to match bulk delete logic, or allow if user really wants to (but manual voiding is better).
 * Let's assume deletion is for erroneous UNPAID invoices.
 */
export async function deleteSingleInvoice(requestId: string) {
    try {
        const admin = await ensureMember();
        if (admin.role !== 'ADMIN') return { success: false, error: "Unauthorized" };

        const request = await prisma.paymentRequest.findUnique({ where: { id: requestId } });
        if (!request) return { success: false, error: "Fant ikke krav" };

        if (request.status === RequestStatus.PAID) {
            return { success: false, error: "Kan ikke slette et betalt krav. Marker som ubetalt først." };
        }

        await prisma.paymentRequest.delete({ where: { id: requestId } });

        revalidatePath("/admin/finance/income");
        return { success: true };

    } catch (error) {
        console.error("Failed to delete single invoice:", error);
        return { success: false, error: "Kunne ikke slette krav" };
    }
}

/**
 * Manually create monthly fees for a single member for a range of months.
 * Skips already existing requests.
 */
export async function createFutureMonthlyFees(memberId: string, startYear: number, startMonth: number, count: number = 1) {
    try {
        const admin = await ensureMember();
        if (admin.role !== 'ADMIN') return { success: false, error: "Unauthorized" };

        const member = await prisma.member.findUnique({ where: { id: memberId } });
        if (!member) return { success: false, error: "Fant ikke medlem" };

        let createdCount = 0;
        let skippedCount = 0;

        for (let i = 0; i < count; i++) {
            // Calculate date for this iteration
            const d = new Date(startYear, (startMonth - 1) + i, 1);
            const y = d.getFullYear();
            const m = d.getMonth() + 1; // 1-indexed

            const title = getFeeTitle(y, m);
            const dueDate = getMonthEndDate(y, m);

            // Check existence
            const existing = await prisma.paymentRequest.findFirst({
                where: {
                    memberId: member.id,
                    title,
                    category: PaymentCategory.MEMBERSHIP_FEE
                }
            });

            if (existing) {
                skippedCount++;
                continue;
            }

            // Fetch fee dynamically
            // Optimization: could fetch once outside loop, but loop is small usually.
            const type = await prisma.membershipType.findUnique({ where: { name: member.membershipType } });
            const amount = type?.fee ?? 750;

            await prisma.paymentRequest.create({
                data: {
                    title,
                    description: `Månedlig kontingent for ${m}/${y}`,
                    amount,
                    dueDate,
                    memberId: member.id,
                    category: PaymentCategory.MEMBERSHIP_FEE,
                    status: RequestStatus.PENDING
                }
            });

            // Notify
            createNotification({
                memberId: member.id,
                type: "INVOICE_CREATED",
                title: `Ny Medlemskontingent: ${title}`,
                message: `Din faktura for ${m}/${y} er nå tilgjengelig. Beløp: ${amount} kr.`,
                link: "/invoices"
            }).catch(e => console.error("Notification failed", e));

            createdCount++;
        }

        revalidatePath("/admin/finance/income");
        return { success: true, created: createdCount, skipped: skippedCount };

    } catch (error) {
        console.error("Failed to create future fees:", error);
        return { success: false, error: "Kunne ikke opprette krav" };
    }
}

export async function getMonthlyPaymentStatus(year: number, month: number) {
    try {
        const member = await ensureMember();
        if (member.role !== 'ADMIN') throw new Error("Unauthorized");

        const pad = (n: number) => n.toString().padStart(2, '0');

        // We look at 3 periods: Current, Prev, PrevPrev
        const periods = [];
        for (let i = 0; i < 3; i++) {
            const d = new Date(year, month - 1 - i, 1);
            periods.push({
                year: d.getFullYear(),
                month: d.getMonth() + 1,
                title: getFeeTitle(d.getFullYear(), d.getMonth() + 1)
            });
        }

        const titles = periods.map(p => p.title);


        // Fetch members with their requests for these 3 periods
        const members = ((await prisma.member.findMany({
            orderBy: { firstName: 'asc' },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                membershipType: true,
                paymentRequests: {
                    where: {
                        title: { in: titles },
                        category: PaymentCategory.MEMBERSHIP_FEE
                    },
                    select: {
                        id: true,
                        title: true,
                        amount: true,
                        status: true,
                    },
                }
            }
        }) as unknown) as Array<{
            id: string;
            firstName: string | null;
            lastName: string | null;
            membershipType: string;
            paymentRequests: Array<{
                id: string;
                title: string;
                amount: number | Prisma.Decimal;
                status: RequestStatus;
            }>;
        }>);

        // Calculate stats for CURRENT period (index 0)
        let totalCollected = 0;
        let potentialIncome = 0; // Based on Requests generated
        let paidCount = 0;
        let totalRequestsThisMonth = 0;

        const currentTitle = titles[0];

        const memberStatuses = members.map((member) => {
            // Map requests by title for easy lookup
            const requestMap = new Map();
            member.paymentRequests.forEach(r => {
                requestMap.set(r.title, r);
            });

            const currentRequest = requestMap.get(currentTitle);

            if (currentRequest) {
                const currentAmount = Number(currentRequest.amount);
                totalRequestsThisMonth++;
                potentialIncome += currentAmount;
                if (currentRequest.status === 'PAID') {
                    totalCollected += currentAmount;
                    paidCount++;
                }
            }

            // If no request exists, status is "NO_REQUEST" (or treated as Exempt/Unpaid?)
            // For now, let's treat missing request as "N/A" or handling it in UI.

            return {
                id: member.id,
                name: `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Ukjent Navn',
                membershipType: member.membershipType,
                avatarUrl: null,
                history: {
                    // Return the Request Object, or Status?
                    // UI expects status string currently.
                    // Returning { status: 'PAID', requestId: '...' } is better for clicking.
                    [titles[0]]: currentRequest ? { status: currentRequest.status, id: currentRequest.id } : null,
                    [titles[1]]: requestMap.get(titles[1]) ? { status: requestMap.get(titles[1])?.status, id: requestMap.get(titles[1])?.id } : null,
                    [titles[2]]: requestMap.get(titles[2]) ? { status: requestMap.get(titles[2])?.status, id: requestMap.get(titles[2])?.id } : null,
                }
            };
        });

        return {
            members: memberStatuses,
            periods: titles, // Passing titles as keys
            stats: {
                totalCollected,
                expectedTotal: potentialIncome,
                missing: potentialIncome - totalCollected,
                paidCount,
                totalCount: totalRequestsThisMonth,
                percentage: totalRequestsThisMonth > 0 ? Math.round((paidCount / totalRequestsThisMonth) * 100) : 0
            }
        };

    } catch (error) {
        console.error("Error fetching payment status:", error);
        throw new Error("Kunne ikke hente betalingsstatus");
    }
}


/* 
 * Toggle Payment Status:
 * If Paid -> Unpaid (Void Transaction)
 * If Unpaid -> Paid (Create Transaction)
 */
export async function togglePaymentStatus(requestId: string) {
    try {
        const user = await ensureMember();
        if (user.role !== 'ADMIN') throw new Error("Unauthorized");

        const request = await prisma.paymentRequest.findUnique({
            where: { id: requestId },
            include: { transaction: true }
        });

        if (!request) throw new Error("Request not found");

        if (request.status === 'PAID') {
            // Mark UNPAID and Delete Transaction
            await prisma.$transaction(async (tx) => {
                if (request.transactionId) {
                    await tx.transaction.delete({ where: { id: request.transactionId } });
                }

                // Update Request status
                await tx.paymentRequest.update({
                    where: { id: requestId },
                    data: {
                        status: RequestStatus.PENDING,
                        transactionId: null
                    }
                });

                // Revert Member Balance (Decrement because we are voiding the payment)
                await tx.member.update({
                    where: { id: request.memberId },
                    data: {
                        balance: {
                            decrement: request.amount
                        }
                    }
                });

                // Revert Payment Status (Fixed: This was missing)
                if (request.category === 'MEMBERSHIP_FEE' && request.dueDate) {
                    const y = request.dueDate.getFullYear();
                    const m = String(request.dueDate.getMonth() + 1).padStart(2, '0');
                    const period = `${y}-${m}`;

                    await tx.payment.updateMany({
                        where: {
                            memberId: request.memberId,
                            period: period
                        },
                        data: {
                            status: "UNPAID",
                            amount: null,
                            paidAt: null
                        }
                    });
                }
            });
        } else {
            // Use our helper to Mark PAID
            await markRequestAsPaid(requestId);
        }

        revalidatePath('/admin/finance/income');
        return { success: true };

    } catch (error) {
        console.error("Error toggling payment:", error);
        return { success: false, error: "Failed to toggle status" };
    }
}

export async function setInvoiceGroupPaymentStatus(data: {
    groupId: string;
    targetStatus: "PAID" | "PENDING";
}) {
    try {
        const user = await ensureMember();
        if (user.role !== "ADMIN") return { success: false, error: "Unauthorized" };

        const invoiceGroup = await prisma.paymentRequest.findUnique({
            where: { id: data.groupId },
            select: { id: true, title: true, createdAt: true }
        });

        if (!invoiceGroup) {
            return { success: false, error: "Fant ingen fakturaer i denne gruppen." };
        }

        const sourceStatus =
            data.targetStatus === "PAID" ? RequestStatus.PENDING : RequestStatus.PAID;

        const requestsToToggle = await prisma.paymentRequest.findMany({
            where: {
                title: invoiceGroup.title,
                createdAt: invoiceGroup.createdAt,
                status: sourceStatus
            },
            select: {
                id: true,
                title: true,
                amount: true,
                memberId: true,
                eventId: true,
                dueDate: true,
                category: true,
                transactionId: true
            }
        });

        if (requestsToToggle.length === 0) {
            return { success: true, updatedCount: 0, totalCount: 0 };
        }

        let updatedCount = 0;
        const depositNotifications: Array<{
            memberId: string;
            type: "BALANCE_DEPOSIT";
            title: string;
            message: string;
            link: string;
        }> = [];
        for (const request of requestsToToggle) {
            if (data.targetStatus === "PAID") {
                await prisma.$transaction(async (tx) => {
                    const transaction = await tx.transaction.create({
                        data: {
                            amount: request.amount,
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

                    await tx.paymentRequest.update({
                        where: { id: request.id },
                        data: {
                            status: RequestStatus.PAID,
                            transactionId: transaction.id
                        }
                    });

                    await tx.member.update({
                        where: { id: request.memberId },
                        data: {
                            balance: {
                                increment: request.amount
                            }
                        }
                    });

                    if (request.category === PaymentCategory.MEMBERSHIP_FEE && request.dueDate) {
                        const y = request.dueDate.getFullYear();
                        const m = String(request.dueDate.getMonth() + 1).padStart(2, '0');
                        const period = `${y}-${m}`;
                        await tx.payment.upsert({
                            where: {
                                memberId_period: {
                                    memberId: request.memberId,
                                    period
                                }
                            },
                            update: {
                                status: "PAID",
                                paidAt: new Date(),
                                amount: Math.round(Number(request.amount))
                            },
                            create: {
                                memberId: request.memberId,
                                period,
                                status: "PAID",
                                paidAt: new Date(),
                                amount: Math.round(Number(request.amount))
                            }
                        });
                    }
                });

                depositNotifications.push({
                    memberId: request.memberId,
                    type: "BALANCE_DEPOSIT",
                    title: "Innbetaling registrert",
                    message: `Vi har registrert en innbetaling på ${formatNok(Number(request.amount))} kr for "${request.title}".`,
                    link: "/balance"
                });
            } else {
                await prisma.$transaction(async (tx) => {
                    if (request.transactionId) {
                        await tx.transaction.delete({ where: { id: request.transactionId } });
                    }

                    await tx.paymentRequest.update({
                        where: { id: request.id },
                        data: {
                            status: RequestStatus.PENDING,
                            transactionId: null
                        }
                    });

                    await tx.member.update({
                        where: { id: request.memberId },
                        data: {
                            balance: {
                                decrement: request.amount
                            }
                        }
                    });

                    if (request.category === PaymentCategory.MEMBERSHIP_FEE && request.dueDate) {
                        const y = request.dueDate.getFullYear();
                        const m = String(request.dueDate.getMonth() + 1).padStart(2, '0');
                        const period = `${y}-${m}`;
                        await tx.payment.updateMany({
                            where: {
                                memberId: request.memberId,
                                period
                            },
                            data: {
                                status: "UNPAID",
                                amount: null,
                                paidAt: null
                            }
                        });
                    }
                });
            }
            updatedCount++;
        }

        if (depositNotifications.length > 0) {
            await createManyNotifications(depositNotifications);
        }

        revalidatePath("/admin/finance");
        revalidatePath("/admin/finance/income");
        revalidatePath("/admin/finance/invoices");
        revalidatePath(`/admin/finance/invoices/${encodeURIComponent(data.groupId)}`);

        return {
            success: true,
            updatedCount,
            totalCount: requestsToToggle.length
        };
    } catch (error) {
        console.error("Failed to update invoice group payment status:", error);
        return { success: false, error: "Kunne ikke oppdatere fakturastatus for gruppen." };
    }
}


export async function getMembersAndEvents() {
    try {
        const member = await ensureMember();
        if (member.role !== 'ADMIN') return { members: [], events: [] };

        const [members, events] = await Promise.all([
            prisma.member.findMany({
                orderBy: { firstName: 'asc' },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    createdAt: true
                },
                cacheStrategy: { ttl: 60, swr: 60 }
            }),
            prisma.event.findMany({
                orderBy: { startAt: 'desc' },
                where: {
                    startAt: {
                        gte: new Date(new Date().getFullYear(), 0, 1)
                    }
                },
                select: {
                    id: true,
                    title: true,
                    startAt: true
                },
                cacheStrategy: { ttl: 60, swr: 60 }
            })
        ]);

        return { members, events };
    } catch (error) {
        console.error("Failed to fetch members and events:", error);
        return { members: [], events: [] };
    }
}

export async function registerExpense(data: {
    amount: number;
    description: string;
    category: string;
    date: Date;
    eventId?: string;
    splitMemberIds: string[];
    receiptUrl?: string;
    receiptKey?: string;
}) {
    try {
        const member = await ensureMember();
        if (member.role !== 'ADMIN') return { success: false, error: "Unauthorized" };

        const { amount, description, category, date, eventId, splitMemberIds, receiptUrl, receiptKey } = data;
        const totalAmount = roundToTwoDecimals(Math.abs(amount));
        const cleanDescription = description.trim();
        const uniqueSplitMemberIds = Array.from(new Set(splitMemberIds.filter(Boolean)));

        if (!cleanDescription) {
            return { success: false, error: "Beskrivelse må fylles ut" };
        }

        if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
            return { success: false, error: "Beløp må være større enn 0" };
        }

        if (uniqueSplitMemberIds.length === 0) {
            await prisma.transaction.create({
                data: {
                    amount: -totalAmount,
                    description: cleanDescription,
                    category,
                    date,
                    eventId: eventId || null,
                    receiptUrl: receiptUrl || null,
                    receiptKey: receiptKey || null
                }
            });
        }
        else {
            const shares = splitAmountIntoShares(totalAmount, uniqueSplitMemberIds.length);

            await prisma.$transaction(async (tx) => {
                await Promise.all(uniqueSplitMemberIds.map(async (memberId, index) => {
                    const share = shares[index] ?? 0;
                    return Promise.all([
                        tx.transaction.create({
                            data: {
                                amount: -share,
                                description: `${cleanDescription}${EXPENSE_SPLIT_SUFFIX}`,
                                category,
                                date,
                                eventId: eventId || null,
                                receiptUrl: receiptUrl || null,
                                receiptKey: receiptKey || null,
                                memberId
                            }
                        }),
                        tx.member.update({
                            where: { id: memberId },
                            data: {
                                balance: {
                                    decrement: share
                                }
                            }
                        })
                    ]);
                }));
            });

            await createManyNotifications(uniqueSplitMemberIds.map((memberId, index) => {
                const share = shares[index] ?? 0;
                return {
                    memberId,
                    type: "BALANCE_WITHDRAWAL" as const,
                    title: "Ny belastning",
                    message: `Din konto har blitt belastet med ${share.toFixed(2)} kr for: ${cleanDescription}`,
                    link: "/dashboard"
                };
            }));
        }

        revalidatePath("/admin/finance");
        revalidatePath("/admin/finance/expenses");
        return { success: true };
    } catch (error) {
        console.error("Failed to register expense:", error);
        return { success: false, error: "Kunne ikke registrere utgift" };
    }
}

const buildExpenseGroupWhere = (tx: {
    date: Date;
    category: string;
    description: string;
    eventId: string | null;
    receiptKey: string | null;
}): Prisma.TransactionWhereInput => {
    const baseDescription = normalizeExpenseDescription(tx.description);
    return {
        amount: { lt: 0 },
        date: tx.date,
        category: tx.category,
        eventId: tx.eventId,
        receiptKey: tx.receiptKey,
        OR: [
            { description: baseDescription },
            { description: `${baseDescription}${EXPENSE_SPLIT_SUFFIX}` }
        ]
    };
};

type ExpenseTransaction = Prisma.TransactionGetPayload<{
    include: {
        member: { select: { id: true, firstName: true, lastName: true } },
        event: { select: { id: true, title: true } }
    }
}>;

const getExpenseGroupKey = (tx: {
    date: Date;
    category: string;
    description: string;
    eventId: string | null;
    receiptKey: string | null;
}) => {
    const baseDescription = normalizeExpenseDescription(tx.description);
    return [
        tx.date.toISOString(),
        baseDescription,
        tx.category,
        tx.eventId || "",
        tx.receiptKey || ""
    ].join("::");
};

const groupExpenseTransactions = (transactions: ExpenseTransaction[], orderedGroupKeys: string[]) => {
    const includedKeys = new Set(orderedGroupKeys);
    const grouped = new Map<string, {
        id: string;
        date: string;
        description: string;
        category: string;
        totalAmount: number;
        splitCount: number;
        memberIds: string[];
        members: { id: string; name: string }[];
        eventId: string | null;
        eventTitle: string | null;
        receiptUrl: string | null;
        receiptKey: string | null;
        transactionIds: string[];
        createdAt: string;
    }>();

    for (const tx of transactions) {
        const key = getExpenseGroupKey(tx);
        if (!includedKeys.has(key)) continue;

        if (!grouped.has(key)) {
            grouped.set(key, {
                id: tx.id,
                date: tx.date.toISOString(),
                description: normalizeExpenseDescription(tx.description),
                category: tx.category,
                totalAmount: 0,
                splitCount: 0,
                memberIds: [],
                members: [],
                eventId: tx.eventId,
                eventTitle: tx.event?.title || null,
                receiptUrl: tx.receiptUrl || null,
                receiptKey: tx.receiptKey || null,
                transactionIds: [],
                createdAt: tx.createdAt.toISOString()
            });
        }

        const group = grouped.get(key)!;
        group.totalAmount = roundToTwoDecimals(group.totalAmount + Math.abs(Number(tx.amount)));
        group.transactionIds.push(tx.id);

        if (tx.memberId && tx.member && !group.memberIds.includes(tx.memberId)) {
            group.memberIds.push(tx.memberId);
            group.members.push({
                id: tx.memberId,
                name: `${tx.member.firstName || ""} ${tx.member.lastName || ""}`.trim() || "Ukjent medlem"
            });
        }
    }

    return orderedGroupKeys
        .map((key) => grouped.get(key))
        .filter((group): group is NonNullable<typeof group> => Boolean(group))
        .map((group) => ({
            ...group,
            splitCount: group.memberIds.length
        }));
};

export async function getAdminExpenses(data?: {
    cursor?: string | null;
    limit?: number;
    query?: string;
    category?: string;
}) {
    try {
        const member = await ensureMember();
        if (member.role !== 'ADMIN') return { success: false, error: "Unauthorized" };

        const limit = Math.min(Math.max(data?.limit ?? 20, 1), 50);
        const trimmedQuery = data?.query?.trim() || "";
        const selectedCategory = data?.category?.trim();
        const batchSize = Math.max(limit * 6, 60);

        const seedWhere: Prisma.TransactionWhereInput = {
            amount: { lt: 0 },
            ...(selectedCategory && selectedCategory !== "ALL" ? { category: selectedCategory } : {}),
            ...(trimmedQuery ? {
                OR: [
                    { description: { contains: trimmedQuery } },
                    { category: { contains: trimmedQuery } },
                    {
                        event: {
                            is: {
                                title: { contains: trimmedQuery }
                            }
                        }
                    },
                    {
                        member: {
                            is: {
                                OR: [
                                    { firstName: { contains: trimmedQuery } },
                                    { lastName: { contains: trimmedQuery } }
                                ]
                            }
                        }
                    }
                ]
            } : {})
        };

        const groupSeedMap = new Map<string, ExpenseTransaction>();
        let cursor = data?.cursor || null;
        let nextCursor: string | null = null;
        let exhausted = false;

        while (!nextCursor && !exhausted) {
            const batch = (await prisma.transaction.findMany({
                where: seedWhere,
                orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
                take: batchSize + 1,
                ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
                include: {
                    member: { select: { id: true, firstName: true, lastName: true } },
                    event: { select: { id: true, title: true } }
                }
            })) as ExpenseTransaction[];

            if (batch.length === 0) {
                exhausted = true;
                break;
            }

            const hasMoreRows = batch.length > batchSize;
            const pageRows = hasMoreRows ? batch.slice(0, batchSize) : batch;
            let previousRowId: string | null = cursor;

            for (const tx of pageRows) {
                const key = getExpenseGroupKey(tx);
                if (!groupSeedMap.has(key)) {
                    groupSeedMap.set(key, tx);
                    if (groupSeedMap.size === limit + 1) {
                        nextCursor = previousRowId;
                        break;
                    }
                }
                previousRowId = tx.id;
            }

            if (nextCursor) break;

            if (!hasMoreRows) {
                exhausted = true;
                break;
            }

            cursor = pageRows[pageRows.length - 1]?.id ?? null;
        }

        const orderedGroupKeys = Array.from(groupSeedMap.keys()).slice(0, limit);
        if (orderedGroupKeys.length === 0) {
            return { success: true, expenses: [], nextCursor: null, hasMore: false };
        }

        const fullGroupWhere = orderedGroupKeys
            .map((key) => groupSeedMap.get(key))
            .filter((tx): tx is ExpenseTransaction => Boolean(tx))
            .map((tx) =>
                buildExpenseGroupWhere({
                    date: tx.date,
                    category: tx.category,
                    description: tx.description,
                    eventId: tx.eventId,
                    receiptKey: tx.receiptKey
                })
            );

        const fullGroupTransactions = (await prisma.transaction.findMany({
            where: {
                amount: { lt: 0 },
                OR: fullGroupWhere
            },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
            include: {
                member: { select: { id: true, firstName: true, lastName: true } },
                event: { select: { id: true, title: true } }
            }
        })) as ExpenseTransaction[];

        const expenses = groupExpenseTransactions(fullGroupTransactions, orderedGroupKeys);

        return { success: true, expenses, nextCursor, hasMore: Boolean(nextCursor) };
    } catch (error) {
        console.error("Failed to fetch expenses:", error);
        return { success: false, error: "Kunne ikke hente utgifter" };
    }
}

const getExpenseTransactionsForMutation = async (data: {
    expenseId: string;
    transactionIds?: string[];
}) => {
    const explicitIds = Array.from(new Set((data.transactionIds || []).filter(Boolean)));

    if (explicitIds.length > 0) {
        const ids = Array.from(new Set([data.expenseId, ...explicitIds]));
        const relatedTransactions = await prisma.transaction.findMany({
            where: {
                id: { in: ids },
                amount: { lt: 0 }
            },
            select: { id: true, amount: true, memberId: true }
        });

        if (relatedTransactions.length !== ids.length) {
            return { error: "Fant ikke alle transaksjoner i denne utgiften", relatedTransactions: [] };
        }

        return { error: null, relatedTransactions };
    }

    const targetTx = await prisma.transaction.findUnique({
        where: { id: data.expenseId },
        select: { id: true, date: true, category: true, description: true, eventId: true, receiptKey: true }
    });

    if (!targetTx) {
        return { error: "Fant ikke utgift", relatedTransactions: [] };
    }

    const relatedTransactions = await prisma.transaction.findMany({
        where: buildExpenseGroupWhere(targetTx),
        select: { id: true, amount: true, memberId: true }
    });

    if (relatedTransactions.length === 0) {
        return { error: "Fant ingen transaksjoner i denne utgiften", relatedTransactions: [] };
    }

    return { error: null, relatedTransactions };
};

export async function updateExpense(data: {
    expenseId: string;
    transactionIds?: string[];
    amount: number;
    description: string;
    category: string;
    date: Date;
    eventId?: string | null;
    splitMemberIds: string[];
    receiptUrl?: string | null;
    receiptKey?: string | null;
}) {
    try {
        const member = await ensureMember();
        if (member.role !== 'ADMIN') return { success: false, error: "Unauthorized" };

        const normalizedAmount = roundToTwoDecimals(Math.abs(data.amount));
        const description = data.description.trim();
        const splitMemberIds = Array.from(new Set(data.splitMemberIds.filter(Boolean)));

        if (!description) return { success: false, error: "Beskrivelse må fylles ut" };
        if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
            return { success: false, error: "Beløp må være større enn 0" };
        }

        const { error, relatedTransactions } = await getExpenseTransactionsForMutation({
            expenseId: data.expenseId,
            transactionIds: data.transactionIds
        });

        if (error) return { success: false, error };

        await prisma.$transaction(async (tx) => {
            // Revert previous balance impact
            await Promise.all(
                relatedTransactions
                    .filter((entry) => entry.memberId)
                    .map((entry) =>
                        tx.member.update({
                            where: { id: entry.memberId! },
                            data: {
                                balance: {
                                    decrement: entry.amount
                                }
                            }
                        })
                    )
            );

            // Remove old group
            await tx.transaction.deleteMany({
                where: { id: { in: relatedTransactions.map((entry) => entry.id) } }
            });

            const eventId = data.eventId || null;
            const receiptUrl = data.receiptUrl || null;
            const receiptKey = data.receiptKey || null;

            if (splitMemberIds.length === 0) {
                await tx.transaction.create({
                    data: {
                        amount: -normalizedAmount,
                        description,
                        category: data.category,
                        date: data.date,
                        eventId,
                        receiptUrl,
                        receiptKey
                    }
                });
                return;
            }

            const shares = splitAmountIntoShares(normalizedAmount, splitMemberIds.length);
            await Promise.all(splitMemberIds.map(async (memberId, index) => {
                const share = shares[index] ?? 0;
                await Promise.all([
                    tx.transaction.create({
                        data: {
                            amount: -share,
                            description: `${description}${EXPENSE_SPLIT_SUFFIX}`,
                            category: data.category,
                            date: data.date,
                            eventId,
                            receiptUrl,
                            receiptKey,
                            memberId
                        }
                    }),
                    tx.member.update({
                        where: { id: memberId },
                        data: {
                            balance: {
                                decrement: share
                            }
                        }
                    })
                ]);
            }));
        });

        revalidatePath("/admin/finance");
        revalidatePath("/admin/finance/expenses");
        revalidatePath("/admin/finance/transactions");
        return { success: true };
    } catch (error) {
        console.error("Failed to update expense:", error);
        return { success: false, error: "Kunne ikke oppdatere utgift" };
    }
}

export async function deleteExpense(data: {
    expenseId: string;
    transactionIds?: string[];
}) {
    try {
        const member = await ensureMember();
        if (member.role !== 'ADMIN') return { success: false, error: "Unauthorized" };

        const { error, relatedTransactions } = await getExpenseTransactionsForMutation({
            expenseId: data.expenseId,
            transactionIds: data.transactionIds
        });

        if (error) return { success: false, error };

        await prisma.$transaction(async (tx) => {
            await Promise.all(
                relatedTransactions
                    .filter((entry) => entry.memberId)
                    .map((entry) =>
                        tx.member.update({
                            where: { id: entry.memberId! },
                            data: {
                                balance: {
                                    decrement: entry.amount
                                }
                            }
                        })
                    )
            );

            await tx.transaction.deleteMany({
                where: { id: { in: relatedTransactions.map((entry) => entry.id) } }
            });
        });

        revalidatePath("/admin/finance");
        revalidatePath("/admin/finance/expenses");
        revalidatePath("/admin/finance/transactions");
        return { success: true, count: relatedTransactions.length };
    } catch (error) {
        console.error("Failed to delete expense:", error);
        return { success: false, error: "Kunne ikke slette utgift" };
    }
}

export async function getCurrentMember() {
    try {
        const member = await ensureMember();
        return {
            ...member,
            balance: member.balance.toNumber(),
            // Ensure userRole is included (ensureMember already fetches it)
            userRole: member.userRole
        };
    } catch (error) {
        return null;
    }
}

export async function getMyFinancialData() {
    try {
        const member = await ensureMember();

        const [paymentRequests, transactions] = await Promise.all([
            // Get unpaid or pending requests
            prisma.paymentRequest.findMany({
                where: {
                    memberId: member.id
                    // status: { not: 'PAID' } // Fetched all for history
                },
                orderBy: { dueDate: 'asc' }
            }),
            // Get recent transactions
            prisma.transaction.findMany({
                where: {
                    memberId: member.id
                },
                orderBy: { date: 'desc' },
                // take: 20 // Full history requested
            })
        ]);

        return {
            memberId: member.id,
            balance: member.balance.toNumber(),
            paymentRequests: paymentRequests.map(pr => ({
                ...pr,
                amount: Number(pr.amount),
                dueDate: pr.dueDate ? pr.dueDate.toISOString() : null,
                createdAt: pr.createdAt.toISOString(),
                updatedAt: pr.updatedAt.toISOString(),
            })),
            transactions: transactions.map(tx => ({
                ...tx,
                amount: tx.amount.toNumber()
            }))
        };
    } catch (error) {
        console.error("Error fetching financial data:", error);
        throw new Error("Kunne ikke hente økonomisk data");
    }
}

export async function getAllTransactions() {
    try {
        const admin = await ensureMember();
        if (admin.role !== 'ADMIN') return { success: false, error: "Unauthorized" };

        const transactions = await prisma.transaction.findMany({
            orderBy: { date: "desc" },
            include: {
                member: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });

        // Grouping Logic (Replicated from API for consistency)
        const groupedTransactionsMap = new Map<string, any>();

        (transactions as any[]).forEach((tx) => {
            const baseDescription = tx.description.replace(" (Splittet)", "");
            const dateKey = tx.date.toISOString();
            const key = `${dateKey}_${baseDescription}_${tx.category}`;

            if (groupedTransactionsMap.has(key)) {
                const existing = groupedTransactionsMap.get(key);
                existing.amount += Number(tx.amount);
                if (tx.member) {
                    const name = `${tx.member.firstName} ${tx.member.lastName}`;
                    if (!existing.members.includes(name)) {
                        existing.members.push(name);
                    }
                }
            } else {
                groupedTransactionsMap.set(key, {
                    id: tx.id,
                    date: tx.date,
                    description: baseDescription,
                    category: tx.category,
                    type: Number(tx.amount) > 0 ? "INNTEKT" : "UTGIFT",
                    amount: Number(tx.amount),
                    members: tx.member ? [`${tx.member.firstName} ${tx.member.lastName}`] : []
                });
            }
        });

        return { success: true, transactions: Array.from(groupedTransactionsMap.values()) };

    } catch (error) {
        console.error("Failed to fetch all transactions:", error);
        return { success: false, error: "Kunne ikke hente transaksjoner" };
    }
}

type TransactionDetailScope = "OWN" | "ADMIN";

export async function getTransactionDetails(transactionId: string, scope: TransactionDetailScope = "OWN") {
    try {
        const member = await ensureMember();

        // 1. Fetch the target transaction first to get key details
        const targetTx = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                member: { select: { firstName: true, lastName: true, id: true, email: true } },
                event: { select: { title: true, id: true } }
            }
        });

        if (!targetTx) {
            return { success: false, error: "Transaksjon ikke funnet" };
        }

        const isOwner = targetTx.memberId === member.id;
        if (scope === "ADMIN") {
            if (member.role !== "ADMIN") {
                return { success: false, error: "Unauthorized" };
            }
        } else {
            if (!isOwner) {
                return { success: false, error: "Unauthorized" };
            }
        }

        // 2. Fetch all transactions that belong to the same grouped row as the list view.
        // Group key on the list page is: exact date + category + description without " (Splittet)" suffix.
        const splitSuffix = " (Splittet)";
        const baseDescription = targetTx.description.replace(splitSuffix, "").trim();

        let relatedTransactions = [targetTx];

        if (scope === "ADMIN") {
            const relatedTransactionsLookup = await prisma.transaction.findMany({
                where: {
                    date: targetTx.date,
                    category: targetTx.category,
                    OR: [
                        { description: baseDescription },
                        { description: `${baseDescription}${splitSuffix}` }
                    ]
                },
                include: {
                    member: { select: { firstName: true, lastName: true, id: true, email: true } },
                    event: { select: { title: true, id: true } }
                }
            });
            relatedTransactions = relatedTransactionsLookup.length > 0 ? relatedTransactionsLookup : [targetTx];
        } else {
            const ownRelatedTransactions = await prisma.transaction.findMany({
                where: {
                    memberId: member.id,
                    date: targetTx.date,
                    category: targetTx.category,
                    OR: [
                        { description: baseDescription },
                        { description: `${baseDescription}${splitSuffix}` }
                    ]
                },
                include: {
                    member: { select: { firstName: true, lastName: true, id: true, email: true } },
                    event: { select: { title: true, id: true } }
                }
            });
            relatedTransactions = ownRelatedTransactions.length > 0 ? ownRelatedTransactions : [targetTx];
        }

        // 3. Aggregate Data
        const totalAmount = relatedTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);

        // Members involved / Allocations
        const allocations = relatedTransactions.map(tx => ({
            id: tx.id,
            amount: Number(tx.amount),
            member: tx.member ? {
                id: tx.member.id,
                name: `${tx.member.firstName} ${tx.member.lastName}`,
                email: tx.member.email
            } : null
        }));

        return {
            success: true,
            data: {
                id: targetTx.id, // Use the requested ID as primary ref
                date: targetTx.date,
                description: baseDescription,
                category: targetTx.category,
                totalAmount,
                type: totalAmount > 0 ? "INNTEKT" : "UTGIFT",
                event: targetTx.event,
                allocations,
                isSplit: relatedTransactions.length > 1,
                createdAt: targetTx.createdAt,
                receiptUrl: targetTx.receiptUrl,
                receiptKey: targetTx.receiptKey,
            }
        };

    } catch (error) {
        console.error("Failed to get transaction details:", error);
        return { success: false, error: "Kunne ikke hente detaljer" };
    }
}

/**
 * Recalculate balances for ALL members based on their transaction history.
 * This effectively fixes any drift between stored balance and actual transactions.
 */
export async function recalculateAllBalances() {
    try {
        const admin = await ensureMember();
        if (admin.role !== 'ADMIN') return { success: false, error: "Unauthorized" };

        // 1. Get all members to ensure we reset those with 0 transactions too
        const members = await prisma.member.findMany({ select: { id: true } });

        // 2. Aggregate transactions by member
        const aggregates = await prisma.transaction.groupBy({
            by: ['memberId'],
            _sum: {
                amount: true
            },
            where: {
                memberId: { not: null }
            }
        });

        // Map memberId -> Sum
        const balanceMap = new Map<string, number>();
        // @ts-ignore - Prisma groupBy types can be finicky depending on version
        aggregates.forEach((agg: any) => {
            if (agg.memberId) {
                balanceMap.set(agg.memberId, agg._sum.amount ? Number(agg._sum.amount) : 0);
            }
        });

        // 3. Update all members
        let updatedCount = 0;

        // We use $transaction for safety, though massive updates might timeout if too many.
        // For a club app (usually < 1000 members), this is fine.
        await prisma.$transaction(
            members.map(member => {
                const correctBalance = balanceMap.get(member.id) || 0;
                updatedCount++;
                return prisma.member.update({
                    where: { id: member.id },
                    data: { balance: correctBalance }
                });
            })
        );

        revalidatePath("/admin/finance");
        revalidatePath("/dashboard"); // For the user reporting the issue

        return { success: true, count: updatedCount };

    } catch (error) {
        console.error("Failed to recalculate balances:", error);
        return { success: false, error: "Kunne ikke synkronisere saldoer" };
    }
}

/**
 * Manually set a member's balance.
 * Creates a correction transaction to account for the difference.
 */
export async function setMemberBalance(memberId: string, newBalance: number, reason: string) {
    try {
        const admin = await ensureMember();
        if (admin.role !== 'ADMIN') return { success: false, error: "Unauthorized" };

        const member = await prisma.member.findUnique({ where: { id: memberId } });
        if (!member) return { success: false, error: "Fant ikke medlem" };

        const currentBalance = member.balance.toNumber();
        const difference = newBalance - currentBalance;

        if (difference === 0) {
            return { success: true, message: "Ingen endring i saldo." };
        }

        await prisma.$transaction(async (tx) => {
            // Create Audit Transaction
            await tx.transaction.create({
                data: {
                    amount: difference,
                    description: `Manuell justering: ${reason}`,
                    category: "MANUAL_ADJUSTMENT",
                    date: new Date(),
                    memberId: member.id,
                }
            });

            // Update Member Balance
            await tx.member.update({
                where: { id: member.id },
                data: { balance: newBalance }
            });
        });

        await createNotification({
            memberId: member.id,
            type: difference >= 0 ? "BALANCE_DEPOSIT" : "BALANCE_WITHDRAWAL",
            title: difference >= 0 ? "Saldojustering (+)" : "Saldojustering (-)",
            message: `Saldoen din er justert med ${formatNok(Math.abs(difference))} kr. Årsak: ${reason}.`,
            link: "/balance"
        });

        revalidatePath("/admin/finance");
        revalidatePath(`/member/${member.id}`);

        return { success: true };

    } catch (error) {
        console.error("Failed to set member balance:", error);
        return { success: false, error: "Kunne ikke oppdatere saldo" };
    }
}

/**
 * Delete a single transaction.
 * Also reverses the balance impact on the member and REVERTS linked payment statuses.
 */
export async function deleteTransaction(transactionId: string) {
    try {
        const admin = await ensureMember();
        if (admin.role !== 'ADMIN') return { success: false, error: "Unauthorized" };

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                member: true,
                paymentRequest: true // Check if linked to a request
            }
        });

        if (!transaction) return { success: false, error: "Transaksjon ikke funnet" };

        await prisma.$transaction(async (tx) => {
            // 1. Revert PaymentRequest Status (if exists)
            if (transaction.paymentRequest) {
                const req = transaction.paymentRequest;

                // Set back to PENDING and remove transaction link
                await tx.paymentRequest.update({
                    where: { id: req.id },
                    data: {
                        status: RequestStatus.PENDING,
                        transactionId: null
                    }
                });

                // If it was a membership fee, we must also update the simplified Payment table
                if (req.category === 'MEMBERSHIP_FEE' && req.dueDate) {
                    // Logic to find the Period string (YYYY-MM) from the due date
                    // Usually due date is 25th of the month it applies to.
                    const y = req.dueDate.getFullYear();
                    const m = String(req.dueDate.getMonth() + 1).padStart(2, '0');
                    const period = `${y}-${m}`;

                    // Set Payment status to UNPAID
                    // We use updateMany in case it doesn't exist (though it should), to avoid errors
                    await tx.payment.updateMany({
                        where: {
                            memberId: req.memberId,
                            period: period
                        },
                        data: {
                            status: "UNPAID",
                            amount: null,
                            paidAt: null
                        }
                    });
                }
            }

            // 2. Delete the transaction
            await tx.transaction.delete({ where: { id: transactionId } });

            // 3. Revert Member Balance
            if (transaction.memberId) {
                await tx.member.update({
                    where: { id: transaction.memberId },
                    data: {
                        balance: {
                            decrement: transaction.amount
                        }
                    }
                });
            }
        });

        revalidatePath("/admin/finance");
        if (transaction.memberId) revalidatePath(`/member/${transaction.memberId}`);

        return { success: true };

    } catch (error) {
        console.error("Failed to delete transaction:", error);
        return { success: false, error: "Kunne ikke slette transaksjon" };
    }
}

/**
 * Delete ALL transactions.
 * Dangerous action. Resets all member balances to 0 AND resets all payment statuses.
 */
export async function deleteAllTransactions() {
    try {
        const admin = await ensureMember();
        if (admin.role !== 'ADMIN') return { success: false, error: "Unauthorized" };

        await prisma.$transaction(async (tx) => {
            // 1. Reset all linked PaymentRequests to PENDING
            // We find all requests that HAVE a transactionId, since we are about to delete those txs.
            await tx.paymentRequest.updateMany({
                where: { transactionId: { not: null } },
                data: {
                    status: RequestStatus.PENDING,
                    transactionId: null
                }
            });

            // 2. Reset ALL Payment records to UNPAID
            // Since "Delete All Transactions" implies a full history wipe/reset.
            await tx.payment.updateMany({
                data: {
                    status: "UNPAID",
                    amount: null,
                    paidAt: null
                }
            });

            // 3. Delete all transactions
            await tx.transaction.deleteMany({});

            // 4. Reset all member balances to 0
            await tx.member.updateMany({
                data: { balance: 0 }
            });
        });

        revalidatePath("/admin/finance");

        return { success: true };

    } catch (error) {
        console.error("Failed to delete all transactions:", error);
        return { success: false, error: "Kunne ikke slette alle transaksjoner" };
    }
}

export async function getAllTransactionsRaw() {
    try {
        const admin = await ensureMember();
        if (admin.role !== 'ADMIN') return { success: false, error: "Unauthorized" };

        const transactions = await prisma.transaction.findMany({
            orderBy: { date: "desc" },
            include: {
                member: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });

        // Map to a cleaner format for the frontend
        const mappedTransactions = (transactions as any[]).map(tx => ({
            id: tx.id,
            date: tx.date,
            description: tx.description,
            category: tx.category,
            type: Number(tx.amount) > 0 ? "INNTEKT" : "UTGIFT",
            amount: Number(tx.amount),
            member: tx.member ? {
                id: tx.member.id,
                name: `${tx.member.firstName} ${tx.member.lastName}`
            } : null
        }));

        return { success: true, transactions: mappedTransactions };

    } catch (error) {
        console.error("Failed to fetch raw transactions:", error);
        return { success: false, error: "Kunne ikke hente transaksjoner" };
    }
}
