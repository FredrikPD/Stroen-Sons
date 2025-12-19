import { NextRequest, NextResponse } from 'next/server';
import { generateMonthlyFees } from '@/server/actions/finance';

export const dynamic = 'force-dynamic'; // static by default, unless reading the request

export async function GET(req: NextRequest) {
    // 1. Authorization Check (Vercel Cron)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Determine Date
    // If runs on 1st of month, we want to generate for THAT month.
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    try {
        const result = await generateMonthlyFees(year, month);

        if (result.success) {
            return NextResponse.json({ success: true, count: result.count });
        } else {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }
    } catch (error) {
        console.error('Cron job failed:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
