import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { ensureMember } from "@/server/auth/ensureMember";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function currentPeriod() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function GET() {
  let member;
  try {
    member = await ensureMember();
  } catch (err) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const period = currentPeriod();

  const [nextEvent, payment, posts] = await Promise.all([
    prisma.event.findFirst({
      where: { startAt: { gte: new Date() } },
      orderBy: { startAt: "asc" },
    }),
    prisma.payment.findUnique({
      where: { memberId_period: { memberId: member.id, period } },
    }),
    prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { author: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  return NextResponse.json({
    member: {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      role: member.role,
      joinedAt: member.createdAt,
      balance: member.balance, // Return Decimal
    },
    period,
    nextEvent: nextEvent ? {
      ...nextEvent,
      startAt: nextEvent.startAt.toISOString(),
      coverImage: "https://weblium.com/blog/wp-content/uploads/2019/12/imgonline-com-ua-Compressed-8vwTmURAw7-1344x734.jpg"
    } : null,
    paymentStatus: payment?.status ?? "UNPAID",
    posts: posts.map(p => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
    })),
  });
}