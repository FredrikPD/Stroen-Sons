import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { ensureMember } from "@/server/auth/ensureMember";
import { MEMBER_FEES } from "@/lib/finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    let member;
    try {
        member = await ensureMember();
    } catch (err) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (member.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Determine the start of the current year for filtering income/expenses
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);

    const [transactions, treasurySum, incomeSum, expenseSum, members, memberBalances] = await Promise.all([
        // Fetch recent transactions with member info
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
        // Calculate current balance (sum of all transactions)
        prisma.transaction.aggregate({
            _sum: { amount: true },
        }),
        // Calculate total income for current year
        prisma.transaction.aggregate({
            _sum: { amount: true },
            where: {
                amount: { gt: 0 },
                date: { gte: startOfYear },
            },
        }),
        // Calculate total expenses for current year
        prisma.transaction.aggregate({
            _sum: { amount: true },
            where: {
                amount: { lt: 0 },
                date: { gte: startOfYear },
            },
        }),
        // Fetch all members to calculate expected income
        prisma.member.findMany({
            select: { membershipType: true }
        }),
        // Fetch members with balances for the widget
        // Fetch members with balances for the widget
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

            // 1. Fetch non-zero balance members (up to 5)
            const nonZeroMembers = await prisma.member.findMany({
                where: { balance: { not: 0 } },
                take: 5,
                orderBy: { updatedAt: 'desc' },
                select
            });

            // 2. If we have fewer than 5, fill with zero-balance members
            if (nonZeroMembers.length < 5) {
                const zeroMembers = await prisma.member.findMany({
                    where: { balance: 0 },
                    take: 5 - nonZeroMembers.length,
                    orderBy: { updatedAt: 'desc' },
                    select
                });

                // Combine and sort by updatedAt desc
                return [...nonZeroMembers, ...zeroMembers].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
            }

            return nonZeroMembers;
        })()
    ]);

    // Calculate expected annual income
    const expectedAnnualIncome = members.reduce((acc, member) => {
        const monthlyFee = MEMBER_FEES[member.membershipType as keyof typeof MEMBER_FEES] || MEMBER_FEES.STANDARD;
        return acc + (monthlyFee * 12);
    }, 0);


    // Group transactions
    const groupedTransactionsMap = new Map<string, any>();

    transactions.forEach((tx: any) => {
        // Normalize description by removing " (Splittet)"
        const baseDescription = tx.description.replace(" (Splittet)", "");
        const dateKey = tx.date.toISOString(); // Use full ISO string to group by exact time
        const key = `${dateKey}_${baseDescription}_${tx.category}`;

        if (groupedTransactionsMap.has(key)) {
            const existing = groupedTransactionsMap.get(key);
            existing.amount += Number(tx.amount);
        } else {
            groupedTransactionsMap.set(key, {
                id: tx.id,
                date: tx.date,
                description: baseDescription,
                subDescription: "",
                category: tx.category,
                type: Number(tx.amount) > 0 ? "INNTEKT" : "UTGIFT",
                amount: Number(tx.amount),
                status: "success",
                member: tx.member ? { // Add member info if available
                    firstName: tx.member.firstName,
                    lastName: tx.member.lastName,
                    email: tx.member.email
                } : undefined
            });
        }
    });

    const groupedTransactions = Array.from(groupedTransactionsMap.values());

    return NextResponse.json({
        treasuryBalance: treasurySum._sum.amount?.toNumber() ?? 0,
        totalIncome: incomeSum._sum.amount?.toNumber() ?? 0,
        totalExpenses: expenseSum._sum.amount?.toNumber() ?? 0,
        expectedAnnualIncome,
        transactions: groupedTransactions.slice(0, 10), // Limit to 10 for dashboard
        memberBalances: memberBalances.map(m => ({ // Map Decimal to number for JSON
            ...m,
            balance: Number(m.balance)
        }))
    });
}
