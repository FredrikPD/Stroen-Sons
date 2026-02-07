"use server";

import { db } from "@/server/db";

export type ReportRow = {
    id: string;
    date: Date;
    description: string;
    category: string;
    type: string;
    totalAmount: number;
    memberAmounts: Record<string, number>;
};

export type FinancialReportData = {
    members: { id: string; name: string }[];
    rows: ReportRow[];
};

export async function getFinancialReport(startDate: Date, endDate: Date) {
    try {
        // Ensure end date is end of day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        // 1. Fetch all members for columns
        const members = await db.member.findMany({
            select: {
                id: true,
                firstName: true,
                lastName: true
            },
            orderBy: {
                firstName: 'asc'
            }
        });

        const memberList = members.map(m => ({
            id: m.id,
            name: `${m.firstName} ${m.lastName}`.trim()
        }));

        // 2. Fetch Transactions
        const transactions = await db.transaction.findMany({
            where: {
                date: {
                    gte: start,
                    lte: end
                }
            },
            include: {
                member: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            },
            orderBy: {
                date: 'desc'
            }
        });

        // 3. Group and Pivot
        const groupedMap = new Map<string, ReportRow>();

        (transactions as any[]).forEach(tx => {
            // Key by Description + Category => roughly equates to "Income/Expense Item"
            // We use description as the main grouper.
            const key = `${tx.description}-${tx.category}`;

            if (!groupedMap.has(key)) {
                groupedMap.set(key, {
                    id: key,
                    date: tx.date, // Use the date of the first encountered (latest) transaction as reference
                    description: tx.description,
                    category: tx.category,
                    type: tx.amount.toNumber() >= 0 ? "INNTEKT" : "UTGIFT",
                    totalAmount: 0,
                    memberAmounts: {}
                });
            }

            const group = groupedMap.get(key)!;
            const amount = tx.amount.toNumber();

            group.totalAmount += amount;

            if (tx.memberId) {
                // Determine which member column to put this in
                // Note: If member is not in 'active' list (deleted/inactive), we might miss them if we only use `memberList` for cols.
                // But `memberAmounts` stores by ID.
                // We should ensure we handle non-active members if they have transactions.
                // For now, consistent with "Active" members is a good start, or we can add them to memberList dynamically?
                // Let's stick to the active members list for simplicity first, or just map IDs.

                // If the member exists in the transaction but not in our active list, we might want to track them?
                // Let's rely on the `memberAmounts` being the source of truth for value, 
                // and `memberList` being the Visual Columns. 
                // Any amount for a member NOT in memberList will be hidden in the grid but counted in Total.

                // Better approach: Should fetch ALL members? 
                // existing code fetched 'ACTIVE'. I will remove the filter to match "Every single user" req.

                group.memberAmounts[tx.memberId] = (group.memberAmounts[tx.memberId] || 0) + amount;
            }
        });

        // Convert to array
        const rows = Array.from(groupedMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime());

        return {
            success: true,
            data: {
                members: memberList,
                rows: rows
            }
        };

    } catch (error) {
        console.error("Failed to generate financial report:", error);
        return { success: false, error: "Kunne ikke generere rapport." };
    }
}
