import "server-only";

import { PaymentCategory, RequestStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import type { FinanceStats, Transaction } from "@/lib/admin-finance";
import { withPrismaRetry } from "@/server/prismaResilience";

function logSettledFailure(result: PromiseSettledResult<unknown>, label: string) {
    if (result.status === "rejected") {
        console.error(`[admin-finance] Failed to load ${label}:`, result.reason);
    }
}

type TransactionMemberPreview = {
    firstName: string | null;
    lastName: string | null;
    email: string;
};

export async function getAdminFinanceData(): Promise<FinanceStats> {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const startOfNextYear = new Date(currentYear + 1, 0, 1);

    const settledData = await Promise.allSettled([
        withPrismaRetry(
            () =>
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
            { operationName: "adminFinance:getTransactions" }
        ),
        withPrismaRetry(
            () =>
                prisma.transaction.aggregate({
                    _sum: { amount: true },
                }),
            { operationName: "adminFinance:getTreasurySum" }
        ),
        withPrismaRetry(
            () =>
                prisma.transaction.aggregate({
                    _sum: { amount: true },
                    where: {
                        amount: { gt: 0 },
                        date: { gte: startOfYear },
                    },
                }),
            { operationName: "adminFinance:getIncomeSum" }
        ),
        withPrismaRetry(
            () =>
                prisma.transaction.aggregate({
                    _sum: { amount: true },
                    where: {
                        amount: { lt: 0 },
                        date: { gte: startOfYear },
                    },
                }),
            { operationName: "adminFinance:getExpenseSum" }
        ),
        withPrismaRetry(
            () =>
                prisma.member.findMany({
                    select: { membershipType: true }
                }),
            { operationName: "adminFinance:getMembers" }
        ),
        withPrismaRetry(
            () =>
                prisma.membershipType.findMany({
                    select: { name: true, fee: true }
                }),
            { operationName: "adminFinance:getMembershipTypes" }
        ),
        withPrismaRetry(
            () =>
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
            { operationName: "adminFinance:getInvoiceRequests" }
        ),
        withPrismaRetry(
            async () => {
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
            },
            { operationName: "adminFinance:getMemberBalances" }
        )
    ] as const);

    logSettledFailure(settledData[0], "transactions");
    logSettledFailure(settledData[1], "treasury sum");
    logSettledFailure(settledData[2], "income sum");
    logSettledFailure(settledData[3], "expense sum");
    logSettledFailure(settledData[4], "members");
    logSettledFailure(settledData[5], "membership types");
    logSettledFailure(settledData[6], "invoice requests");
    logSettledFailure(settledData[7], "member balances");

    const transactions = settledData[0].status === "fulfilled" ? settledData[0].value : [];
    const treasurySum = settledData[1].status === "fulfilled" ? settledData[1].value : { _sum: { amount: null } };
    const incomeSum = settledData[2].status === "fulfilled" ? settledData[2].value : { _sum: { amount: null } };
    const expenseSum = settledData[3].status === "fulfilled" ? settledData[3].value : { _sum: { amount: null } };
    const members = settledData[4].status === "fulfilled" ? settledData[4].value : [];
    const membershipTypes = settledData[5].status === "fulfilled" ? settledData[5].value : [];
    const invoiceRequests = settledData[6].status === "fulfilled" ? settledData[6].value : [];
    const memberBalances = settledData[7].status === "fulfilled" ? settledData[7].value : [];

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

    const groupedTransactionsMap = new Map<string, Transaction>();

    transactions.forEach((tx) => {
        const txMember = (tx as { member?: TransactionMemberPreview | null }).member;
        const baseDescription = tx.description.replace(" (Splittet)", "");
        const dateKey = tx.date.toISOString();
        const key = `${dateKey}_${baseDescription}_${tx.category}`;

        if (groupedTransactionsMap.has(key)) {
            const existing = groupedTransactionsMap.get(key);
            if (existing) {
                existing.amount += Number(tx.amount);
            }
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
                member: txMember ? {
                    firstName: txMember.firstName,
                    lastName: txMember.lastName,
                    email: txMember.email
                } : undefined
            });
        }
    });

    return {
        treasuryBalance: treasurySum._sum.amount ? Number(treasurySum._sum.amount) : 0,
        totalIncome: incomeSum._sum.amount ? Number(incomeSum._sum.amount) : 0,
        totalExpenses: expenseSum._sum.amount ? Number(expenseSum._sum.amount) : 0,
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
