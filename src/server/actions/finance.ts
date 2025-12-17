"use server";

import { prisma } from "@/server/db";
import { ensureMember } from "@/server/auth/ensureMember";
import { revalidatePath } from "next/cache";

import { MEMBER_FEES } from "@/lib/finance";

export async function getMonthlyPaymentStatus(year: number, month: number) {
    try {
        await ensureMember(); // Security check

        // Format periods: Current, Previous, Pre-previous
        // "2025-12"
        const pad = (n: number) => n.toString().padStart(2, '0');

        const currentPeriod = `${year}-${pad(month)}`;

        const prevDate = new Date(year, month - 2, 1); // month is 1-based in args? let's assume 1-based provided
        const prevPeriod = `${prevDate.getFullYear()}-${pad(prevDate.getMonth() + 1)}`;

        const prevPrevDate = new Date(year, month - 3, 1);
        const prevPrevPeriod = `${prevPrevDate.getFullYear()}-${pad(prevPrevDate.getMonth() + 1)}`;

        const periods = [currentPeriod, prevPeriod, prevPrevPeriod];

        // Fetch all non-admin members (or all members? typically admins also pay)
        // Let's fetch all active members
        const members = await prisma.member.findMany({
            orderBy: { firstName: 'asc' },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                membershipType: true,
                role: true,
                clerkId: true, // fallback for avatar
                payments: {
                    where: {
                        period: { in: periods }
                    }
                }
            }
        });

        // Calculate stats for CURRENT period
        let totalCollected = 0;
        let potentialIncome = 0;
        let paidCount = 0;

        const memberStatuses = members.map(member => {
            const fee = MEMBER_FEES[member.membershipType as keyof typeof MEMBER_FEES] || 750;
            potentialIncome += fee;

            const paymentsMap = new Map();
            member.payments.forEach(p => {
                paymentsMap.set(p.period, p);
            });

            // Check current month payment for stats
            const currentPayment = paymentsMap.get(currentPeriod);
            if (currentPayment?.status === 'PAID') {
                totalCollected += (currentPayment.amount || 0); // Use actual paid amount
                paidCount++;
            }

            return {
                id: member.id,
                name: `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Ukjent Navn',
                membershipType: member.membershipType,
                avatarUrl: null, // Don't use clerkId as URL, fall back to initials
                history: {
                    [currentPeriod]: paymentsMap.get(currentPeriod)?.status || 'UNPAID',
                    [prevPeriod]: paymentsMap.get(prevPeriod)?.status || 'UNPAID',
                    [prevPrevPeriod]: paymentsMap.get(prevPrevPeriod)?.status || 'UNPAID',
                }
            };
        });

        return {
            members: memberStatuses,
            periods: periods,
            stats: {
                totalCollected,
                expectedTotal: potentialIncome,
                missing: potentialIncome - totalCollected,
                paidCount,
                totalCount: members.length,
                percentage: members.length > 0 ? Math.round((paidCount / members.length) * 100) : 0
            }
        };

    } catch (error) {
        console.error("Error fetching payment status:", error);
        throw new Error("Kunne ikke hente betalingsstatus");
    }
}

export async function registerPayment(memberId: string, period: string) {
    try {
        const user = await ensureMember();
        if (user.role !== 'ADMIN') {
            throw new Error("Unauthorized");
        }

        // Get member to find correct fee
        const member = await prisma.member.findUnique({ where: { id: memberId } });
        if (!member) throw new Error("Member not found");

        const fee = MEMBER_FEES[member.membershipType as keyof typeof MEMBER_FEES] || 750; // Default if type unknown

        // 1. Create/Update Payment Record
        const payment = await prisma.payment.upsert({
            where: {
                memberId_period: {
                    memberId,
                    period
                }
            },
            update: {
                status: 'PAID',
                amount: fee,
                paidAt: new Date()
            },
            create: {
                memberId,
                period,
                status: 'PAID',
                amount: fee,
                paidAt: new Date()
            }
        });

        // 2. Create Accounting Transaction
        await prisma.transaction.create({
            data: {
                amount: fee,
                description: `Kontingent ${period}`,
                category: "KONTINGENT",
                memberId: memberId,
                date: new Date()
            }
        });

        revalidatePath('/admin/finance/income');
        return { success: true };

    } catch (error) {
        console.error("Error registering payment:", error);
        return { success: false, error: "Feil ved registrering av betaling" };
    }
}

export async function unregisterPayment(memberId: string, period: string) {
    try {
        const user = await ensureMember();
        if (user.role !== 'ADMIN') {
            throw new Error("Unauthorized");
        }

        const payment = await prisma.payment.findUnique({
            where: {
                memberId_period: {
                    memberId,
                    period
                }
            }
        });

        if (payment) {
            // Update to UNPAID instead of deleting to keep record? 
            // Or delete if it was a mistake?
            // Strategy: Update to UNPAID is safer for history, but if we want "Sparse", deleting is actually more correct if it was never paid. 
            // BUT, if we unregister, we should probably also VOID the transaction.
            // For now, let's just set status UNPAID and amount 0.

            await prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'UNPAID',
                    amount: 0,
                    paidAt: null
                }
            });

            // Delete the corresponding transaction(s) to cleanup finance history
            await prisma.transaction.deleteMany({
                where: {
                    memberId: memberId,
                    category: "KONTINGENT",
                    description: `Kontingent ${period}`
                }
            });
        }

        revalidatePath('/admin/finance/income');
        return { success: true };
    } catch (error) {
        console.error("Error unregistering:", error);
        return { success: false };
    }
}
// Helper to get members and events for the expense form
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
                }
            }),
            prisma.event.findMany({
                orderBy: { startAt: 'desc' },
                where: {
                    startAt: {
                        gte: new Date(new Date().getFullYear(), 0, 1) // Only events from this year
                    }
                },
                select: {
                    id: true,
                    title: true,
                    startAt: true
                }
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
        await ensureMember(); // Ensure admin

        const { amount, description, category, date, eventId, splitMemberIds } = data;
        const totalAmount = Math.abs(amount); // Ensure positive for calculation, will be negated for storage

        // 1. If splitMemberIds is empty, create a general transaction
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
        // 2. If split, divide amount and create transaction per member
        else {
            const splitAmount = totalAmount / splitMemberIds.length;

            // Create transactions and update balances in a transaction
            await prisma.$transaction(async (tx) => {
                for (const memberId of splitMemberIds) {
                    // Create transaction for member
                    await tx.transaction.create({
                        data: {
                            amount: -splitAmount,
                            description: `${description} (Splittet)`,
                            category,
                            date,
                            eventId: eventId || null,
                            memberId
                        }
                    });

                    // Update member balance (Expenses reduce balance/increase debt)
                    await tx.member.update({
                        where: { id: memberId },
                        data: {
                            balance: {
                                decrement: splitAmount
                            }
                        }
                    });
                }
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
