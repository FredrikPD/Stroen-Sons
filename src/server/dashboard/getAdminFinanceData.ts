import "server-only";

import { PaymentCategory, RequestStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import type { FinanceStats } from "@/lib/admin-finance";

export async function getAdminFinanceData(): Promise<FinanceStats> {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const startOfNextYear = new Date(currentYear + 1, 0, 1);

    const [transactions, treasurySum, incomeSum, expenseSum, members, membershipTypes, invoiceRequests, memberBalances] = await Promise.all([
        prisma.transaction.findMany({
            take: 100,
            orderBy: { date: "desc" },
            include: {
                member: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    }
                }
            }
        }),
        prisma.transaction.aggregate({
            _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
            _sum: { amount: true },
            where: {
                amount: { gt: 0 },
                date: { gte: startOfYear },
            },
        }),
        prisma.transaction.aggregate({
            _sum: { amount: true },
            where: {
                amount: { lt: 0 },
                date: { gte: startOfYear },
            },
        }),
        prisma.member.findMany({
            select: { membershipType: true }
        }),
        prisma.membershipType.findMany({
            select: { name: true, fee: true }
        }),
        prisma.paymentRequest.findMany({
            where: {
                category: { not: PaymentCategory.MEMBERSHIP_FEE },
                status: { not: RequestStatus.WAIVED },
                OR: [
                    {
                        createdAt: {
                            gte: startOfYear,
                            lt: startOfNextYear
                        }
                    },
                    {
                        dueDate: {
                            gte: startOfYear,
                            lt: startOfNextYear
                        }
                    },
                    {
                        transaction: {
                            is: {
                                date: {
                                    gte: startOfYear,
                                    lt: startOfNextYear
                                }
                            }
                        }
                    }
                ]
            },
            select: { amount: true }
        }),
        (async () => {
            const select = {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                membershipType: true,
                balance: true,
                updatedAt: true,
            };

            const nonZeroMembers = await prisma.member.findMany({
                where: { balance: { not: 0 } },
                take: 5,
                orderBy: { updatedAt: "desc" },
                select
            });

            if (nonZeroMembers.length < 5) {
                const zeroMembers = await prisma.member.findMany({
                    where: { balance: 0 },
                    take: 5 - nonZeroMembers.length,
                    orderBy: { updatedAt: "desc" },
                    select
                });

                return [...nonZeroMembers, ...zeroMembers]
                    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
            }

            return nonZeroMembers;
        })()
    ]);

    const membershipFeeMap = new Map(
        membershipTypes.map((type) => [type.name, Number(type.fee)])
    );
    const defaultMonthlyFee = membershipFeeMap.get("STANDARD") ?? 0;

    const expectedMembershipIncome = members.reduce((acc, member) => {
        const monthlyFee = membershipFeeMap.get(member.membershipType) ?? defaultMonthlyFee;
        return acc + (monthlyFee * 12);
    }, 0);

    const expectedInvoiceIncome = invoiceRequests.reduce(
        (sum, req) => sum + Number(req.amount),
        0
    );
    const expectedAnnualIncome = expectedMembershipIncome + expectedInvoiceIncome;

    const groupedTransactionsMap = new Map<string, any>();

    transactions.forEach((tx: any) => {
        const baseDescription = tx.description.replace(" (Splittet)", "");
        const dateKey = tx.date.toISOString();
        const key = `${dateKey}_${baseDescription}_${tx.category}`;

        if (groupedTransactionsMap.has(key)) {
            const existing = groupedTransactionsMap.get(key);
            existing.amount += Number(tx.amount);
        } else {
            groupedTransactionsMap.set(key, {
                id: tx.id,
                date: tx.date.toISOString(),
                description: baseDescription,
                subDescription: "",
                category: tx.category,
                type: Number(tx.amount) > 0 ? "INNTEKT" : "UTGIFT",
                amount: Number(tx.amount),
                status: "success",
                member: tx.member ? {
                    firstName: tx.member.firstName,
                    lastName: tx.member.lastName,
                    email: tx.member.email
                } : undefined
            });
        }
    });

    return {
        treasuryBalance: treasurySum._sum.amount?.toNumber() ?? 0,
        totalIncome: incomeSum._sum.amount?.toNumber() ?? 0,
        totalExpenses: expenseSum._sum.amount?.toNumber() ?? 0,
        expectedAnnualIncome,
        expectedMembershipIncome,
        expectedInvoiceIncome,
        transactions: Array.from(groupedTransactionsMap.values()).slice(0, 10),
        memberBalances: memberBalances.map((m) => ({
            ...m,
            balance: Number(m.balance)
        }))
    };
}
