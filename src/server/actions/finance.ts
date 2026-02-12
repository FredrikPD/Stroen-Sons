"use server";

import { prisma } from "@/server/db";
import { ensureMember } from "@/server/auth/ensureMember";
import { revalidatePath } from "next/cache";
import { PaymentCategory, RequestStatus, Prisma } from "@prisma/client";
import { markRequestAsPaid } from "./payment-requests";
import { createNotification } from "@/server/actions/notifications";

// Helper to format consistent titles
const getFeeTitle = (year: number, month: number) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `Medlemskontingent ${year}-${pad(month)}`;
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
        const dueDate = new Date(year, month - 1, 1); // Due date 1st of the month

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

            // Notify members about new monthly fee
            await Promise.all(newRequests.map(async (req) => {
                await createNotification({
                    memberId: req.memberId,
                    type: "INVOICE_CREATED",
                    title: `Ny Medlemskontingent: ${req.title}`,
                    message: `Din faktura for ${month}/${year} er nå tilgjengelig. Beløp: ${req.amount} kr.`,
                    link: "/dashboard"
                });
            }));
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
                        amount: req.amount
                    },
                    create: {
                        memberId: req.memberId,
                        period: period,
                        status: "PAID",
                        paidAt: date,
                        amount: req.amount
                    }
                });
            });
        }

        revalidatePath("/admin/finance/income");
        return { success: true, count: pendingRequests.length };

    } catch (error) {
        console.error("Failed to mark all as paid:", error);
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
            const dueDate = new Date(y, m - 1, 1);

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
                link: "/dashboard"
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


        type MemberWithPayments = Prisma.MemberGetPayload<{
            include: { paymentRequests: true }
        }>;

        // Fetch members with their requests for these 3 periods
        const members = (await prisma.member.findMany({
            orderBy: { firstName: 'asc' },
            include: {
                paymentRequests: {
                    where: {
                        title: { in: titles },
                        category: PaymentCategory.MEMBERSHIP_FEE
                    }
                }
            }
        })) as unknown as MemberWithPayments[];

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
        const totalAmount = Math.abs(amount);

        if (splitMemberIds.length === 0) {
            await prisma.transaction.create({
                data: {
                    amount: -totalAmount,
                    description,
                    category,
                    date,
                    eventId: eventId || null,
                    receiptUrl: receiptUrl || null,
                    receiptKey: receiptKey || null
                }
            });
        }
        else {
            const splitAmount = totalAmount / splitMemberIds.length;

            await prisma.$transaction(async (tx) => {
                await Promise.all(splitMemberIds.map(async (memberId) => {
                    return Promise.all([
                        tx.transaction.create({
                            data: {
                                amount: -splitAmount,
                                description: `${description} (Splittet)`,
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
                                    decrement: splitAmount
                                }
                            }
                        })
                    ]);
                }));

                // Notify members
                await Promise.all(splitMemberIds.map(async (memberId) => {
                    await createNotification({
                        memberId,
                        type: "BALANCE_WITHDRAWAL",
                        title: "Ny belastning",
                        message: `Din konto har blitt belastet med ${splitAmount.toFixed(0)} kr for: ${description}`,
                        link: "/dashboard"
                    });
                }));
            });
        }

        revalidatePath("/admin/finance");
        revalidatePath("/admin/finance/expenses");
        return { success: true };
    } catch (error) {
        console.error("Failed to register expense:", error);
        return { success: false, error: "Kunne ikke registrere utgift" };
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

export async function getTransactionDetails(transactionId: string) {
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

        // Allow admins OR the transaction's owner
        const isOwner = targetTx.memberId === member.id;
        if (member.role !== 'ADMIN' && !isOwner) {
            return { success: false, error: "Unauthorized" };
        }

        // 2. Fetch all transactions that belong to the same grouped row as the list view.
        // Group key on the list page is: exact date + category + description without " (Splittet)" suffix.
        const splitSuffix = " (Splittet)";
        const baseDescription = targetTx.description.replace(splitSuffix, "").trim();

        let relatedTransactions = [targetTx];

        if (member.role === "ADMIN") {
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
