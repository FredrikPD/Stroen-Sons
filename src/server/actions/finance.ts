"use server";

import { prisma } from "@/server/db";
import { ensureMember } from "@/server/auth/ensureMember";
import { revalidatePath } from "next/cache";
import { MEMBER_FEES } from "@/lib/finance";
import { PaymentCategory, RequestStatus, Prisma } from "@prisma/client";
import { markRequestAsPaid } from "./payment-requests";

// Helper to format consistent titles
const getFeeTitle = (year: number, month: number) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `Medlemskontingent ${year}-${pad(month)}`;
};

/**
 * Generate (or ensure existence of) monthly fee requests for all active members.
 */
export async function generateMonthlyFees(year: number, month: number) {
    try {
        await ensureMember(); // Security check (Admin only ideally, but ensureMember checks role?)
        // TODO: Ensure strict Admin check here if ensureMember doesn't throw for non-admins?
        // ensureMember returns the member, usually callers check role.

        const title = getFeeTitle(year, month);
        const dueDate = new Date(year, month - 1, 25); // Due date 25th of the month

        // 1. Get all active members
        const members = await prisma.member.findMany({
            where: {
                // Add logic for active members if "status" exists, otherwise all
            }
        });

        // 2. Create requests if they don't exist
        // logic: upsert is hard with many-to-many logic, but we can check existing first
        const existingRequests = await prisma.paymentRequest.findMany({
            where: {
                title,
                category: PaymentCategory.MEMBERSHIP_FEE
            },
            select: { memberId: true }
        });

        const existingMemberIds = new Set(existingRequests.map(r => r.memberId));

        const newRequests = members
            .filter(m => !existingMemberIds.has(m.id))
            .map(m => ({
                title,
                description: `Månedlig kontingent for ${month}/${year}`,
                amount: MEMBER_FEES[m.membershipType as keyof typeof MEMBER_FEES] || 750,
                dueDate,
                memberId: m.id,
                category: PaymentCategory.MEMBERSHIP_FEE,
                status: RequestStatus.PENDING
            }));

        if (newRequests.length > 0) {
            await prisma.paymentRequest.createMany({
                data: newRequests
            });
        }

        revalidatePath("/admin/finance/income");
        return { success: true, count: newRequests.length };

    } catch (error) {
        console.error("Failed to generate fees:", error);
        return { success: false, error: "Failed to generate fees" };
    }
}

export async function getMonthlyPaymentStatus(year: number, month: number) {
    try {
        await ensureMember();

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
                totalRequestsThisMonth++;
                potentialIncome += currentRequest.amount;
                if (currentRequest.status === 'PAID') {
                    totalCollected += currentRequest.amount;
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
                await tx.paymentRequest.update({
                    where: { id: requestId },
                    data: {
                        status: RequestStatus.PENDING,
                        transactionId: null
                    }
                });
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


// Start: Legacy / Other Helpers (kept for compatibility or expense logic) ----------------

export async function getMembersAndEvents() {
    try {
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
}) {
    try {
        await ensureMember();

        const { amount, description, category, date, eventId, splitMemberIds } = data;
        const totalAmount = Math.abs(amount);

        if (splitMemberIds.length === 0) {
            await prisma.transaction.create({
                data: {
                    amount: -totalAmount,
                    description,
                    category,
                    date,
                    eventId: eventId || null
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
            balance: member.balance.toNumber()
        };
    } catch (error) {
        return null;
    }
}

export async function getMyFinancialData() {
    try {
        const member = await ensureMember();

        const [paymentRequests, transactions, balanceAgg] = await Promise.all([
            // Get unpaid or pending requests
            prisma.paymentRequest.findMany({
                where: {
                    memberId: member.id,
                    status: { not: 'PAID' }
                },
                orderBy: { dueDate: 'asc' }
            }),
            // Get recent transactions
            prisma.transaction.findMany({
                where: {
                    memberId: member.id
                },
                orderBy: { date: 'desc' },
                take: 20
            }),
            // Calculate actual balance from all transactions
            prisma.transaction.aggregate({
                where: {
                    memberId: member.id
                },
                _sum: {
                    amount: true
                }
            })
        ]);

        return {
            memberId: member.id,
            balance: balanceAgg._sum.amount ? balanceAgg._sum.amount.toNumber() : 0,
            paymentRequests: paymentRequests.map(pr => ({
                ...pr,
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
