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

    const [transactions, treasurySum, incomeSum, expenseSum, members] = await Promise.all([
        // Fetch recent transactions
        prisma.transaction.findMany({
            take: 50,
            orderBy: { date: "desc" },
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
        })
    ]);

    // Calculate expected annual income
    const expectedAnnualIncome = members.reduce((acc, member) => {
        const monthlyFee = MEMBER_FEES[member.membershipType as keyof typeof MEMBER_FEES] || MEMBER_FEES.STANDARD;
        return acc + (monthlyFee * 12);
    }, 0);

    return NextResponse.json({
        treasuryBalance: treasurySum._sum.amount?.toNumber() ?? 0,
        totalIncome: incomeSum._sum.amount?.toNumber() ?? 0,
        totalExpenses: expenseSum._sum.amount?.toNumber() ?? 0,
        expectedAnnualIncome,
        transactions: transactions.map((tx) => ({
            id: tx.id,
            date: tx.date,
            description: tx.description,
            subDescription: "", // Placeholder
            category: tx.category,
            type: Number(tx.amount) > 0 ? "INNTEKT" : "UTGIFT",
            amount: Number(tx.amount),
            status: "success",
        })),
    });
}
