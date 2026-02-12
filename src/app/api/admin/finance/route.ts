import { NextResponse } from "next/server";
import { ensureMember } from "@/server/auth/ensureMember";
import { getAdminFinanceData } from "@/server/dashboard/getAdminFinanceData";

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

    const data = await getAdminFinanceData();

    return NextResponse.json(data);
}
