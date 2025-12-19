import { PaymentCategory, RequestStatus, type Transaction, type PaymentRequest } from '@prisma/client';
import { db as prisma } from '../../src/server/db';

const getFeeTitle = (period: string) => {
    return `Medlemskontingent ${period}`;
};

async function main() {
    console.log("Starting migration...");

    // 1. Fetch all legacy payments
    const payments = await prisma.payment.findMany();
    console.log(`Found ${payments.length} payments to migrate.`);

    for (const payment of payments) {
        if (payment.status !== 'PAID') continue; // Only migrate paid ones, unpaid were implicit
        if (!payment.amount) continue;

        const title = getFeeTitle(payment.period);

        // Check if already exists to avoid dupes
        const existing = await prisma.paymentRequest.findFirst({
            where: {
                memberId: payment.memberId,
                title: title,
                category: PaymentCategory.MEMBERSHIP_FEE
            }
        });

        if (existing) {
            console.log(`Skipping existing request for ${payment.memberId} - ${title}`);
            continue;
        }

        // Try to find matching transaction
        // Heuristic: Same member, amount approx same, category KONTINGENT, date within month?
        // Actually, existing transactions have `description: Kontingent YYYY-MM`.
        // Let's match by that description or similar.
        const transaction = await prisma.transaction.findFirst({
            where: {
                memberId: payment.memberId,
                amount: payment.amount,
                OR: [
                    { description: `Kontingent ${payment.period}` },
                    { category: 'KONTINGENT' }
                ]
            },
            include: { paymentRequest: true },
            orderBy: { date: 'desc' }
        }) as (Transaction & { paymentRequest: PaymentRequest | null }) | null;

        // Create PaymentRequest
        const pr = await prisma.paymentRequest.create({
            data: {
                title: title,
                description: `Migrert fra gammelt system: ${payment.period}`,
                amount: payment.amount,
                status: RequestStatus.PAID,
                category: PaymentCategory.MEMBERSHIP_FEE,
                memberId: payment.memberId,
                createdAt: payment.paidAt || new Date(),
                updatedAt: payment.updatedAt,
                // If transaction found, link it. BUT transactionId must be unique. 
                // If transaction is already linked, we can't link again.
                // Assuming 1-to-1 mapping was intended.
                transactionId: transaction && !transaction.paymentRequest ? transaction.id : undefined
            }
        });

        console.log(`Migrated ${title} for member ${payment.memberId}. Linked Tx: ${!!transaction}`);
    }

    console.log("Migration complete.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
