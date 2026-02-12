import { NextResponse } from "next/server";
import { ensureMember } from "@/server/auth/ensureMember";
import { getAdminDashboardData } from "@/server/dashboard/getAdminDashboardData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    let member;
    try {
        member = await ensureMember();
    } catch (err) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for Admin, Moderator, OR any custom role with allowed paths
    const hasAccess =
        member.role === "ADMIN" ||
        member.role === "MODERATOR" ||
        (member.userRole?.allowedPaths && member.userRole.allowedPaths.length > 0);

    if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await getAdminDashboardData(member);

    return NextResponse.json(data);
}
