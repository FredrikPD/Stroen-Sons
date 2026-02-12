import { NextRequest, NextResponse } from "next/server";
import { sendInvoiceDeadlineReminders } from "@/server/actions/notifications";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const result = await sendInvoiceDeadlineReminders();
        if (!result.success) {
            return NextResponse.json(
                { success: false, error: "Failed to send invoice deadline reminders" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            dueSoonCount: result.dueSoonCount,
            dueTodayCount: result.dueTodayCount,
        });
    } catch (error) {
        console.error("Invoice deadline cron failed:", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
