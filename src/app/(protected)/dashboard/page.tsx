import Link from "next/link";
import Image from "next/image";
import { type Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { ensureMember } from "@/server/auth/ensureMember";
import { redirect } from "next/navigation";
import { withPrismaRetry } from "@/server/prismaResilience";

import { MyInvoices } from "@/components/dashboard/MyInvoices";
import { getMemberPaymentRequests } from "@/server/actions/payment-requests";
import { EventCountdown } from "@/components/dashboard/EventCountdown";
import { getCategoryColorClasses } from "@/lib/category-colors";


function currentPeriod() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const getNextEvent = async () => {
  return prisma.event.findFirst({
    where: { startAt: { gte: new Date() } },
    orderBy: { startAt: "asc" },
  });
};

const getRecentPosts = async () => {
  return prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    take: 3,
    include: { author: { select: { firstName: true, lastName: true } } },
  });
};

type EventWithPhotos = Prisma.EventGetPayload<{
  include: { photos: { select: { url: true } } }
}>;

const getRecentMemories = async (): Promise<EventWithPhotos[]> => {
  const events = await prisma.event.findMany({
    where: {
      startAt: { lt: new Date() },
      photos: { some: {} },
    },
    orderBy: { startAt: "desc" },
    take: 4,
    include: {
      photos: {
        take: 1,
        orderBy: { createdAt: "desc" }, // or whatever order makes sense
        select: { url: true }
      }
    }
  });

  return events as unknown as EventWithPhotos[];
};

function getSettledValue<T>(result: PromiseSettledResult<T>, fallback: T, label: string): T {
  if (result.status === "fulfilled") {
    return result.value;
  }
  console.error(`[dashboard] Failed to load ${label}:`, result.reason);
  return fallback;
}

export const metadata = {
  title: "Oversikt",
};

export default async function DashboardPage() {
  let member;
  try {
    member = await ensureMember();
  } catch {
    redirect("/sign-in");
  }

  const period = currentPeriod();

  const settledData = await Promise.allSettled([
    withPrismaRetry(() => getNextEvent(), { operationName: "dashboard:getNextEvent" }),
    withPrismaRetry(() => getRecentPosts(), { operationName: "dashboard:getRecentPosts" }),
    withPrismaRetry(
      () =>
        prisma.transaction.findMany({
          where: { memberId: member.id },
          orderBy: { date: "desc" },
          take: 3,
        }),
      { operationName: "dashboard:getRecentTransactions" }
    ),
    getMemberPaymentRequests(member.id),
    withPrismaRetry(() => getRecentMemories(), { operationName: "dashboard:getRecentMemories" })
  ] as const);

  const cachedNextEvent = getSettledValue(settledData[0], null, "next event");
  const cachedPosts = getSettledValue(settledData[1], [], "recent posts");
  const transactions = getSettledValue(settledData[2], [], "recent transactions");
  const paymentRequestsRes = getSettledValue(
    settledData[3],
    { success: false, error: "Failed to fetch requests" },
    "payment requests"
  );
  const cachedMemories = getSettledValue(settledData[4], [], "recent memories");

  const invoices = paymentRequestsRes.success && paymentRequestsRes.data
    ? paymentRequestsRes.data
      .filter((r) => r.status === "PENDING")
      .map(r => ({
        ...r,
        dueDate: r.dueDate ? r.dueDate.toISOString() : null,
        category: r.category.toString(),
        amount: Number(r.amount)
      }))
    : [];

  // Restore Date objects from cache serialization
  const nextEvent = cachedNextEvent ? {
    ...cachedNextEvent,
    startAt: new Date(cachedNextEvent.startAt)
  } : null;
  let isUserSignedUpForNextEvent = false;
  if (nextEvent) {
    try {
      isUserSignedUpForNextEvent = (await withPrismaRetry(
        () =>
          prisma.event.count({
            where: {
              id: nextEvent.id,
              attendees: {
                some: { id: member.id },
              },
            },
          }),
        { operationName: "dashboard:isUserSignedUpForNextEvent" }
      )) > 0;
    } catch (error) {
      console.error("[dashboard] Failed to check event attendance:", error);
    }
  }

  let nextEventColor = "blue";
  const nextEventCategory = nextEvent?.category ?? undefined;
  if (nextEventCategory) {
    try {
      const cat = await withPrismaRetry(
        () =>
          prisma.eventCategory.findFirst({
            where: { name: nextEventCategory },
            select: { color: true }
          }),
        { operationName: "dashboard:getEventCategoryColor" }
      );
      if (cat) nextEventColor = cat.color;
    } catch (error) {
      console.error("[dashboard] Failed to load event category color:", error);
    }
  }

  const posts = cachedPosts.map(post => ({
    ...post,
    createdAt: new Date(post.createdAt)
  }));


  const memories = cachedMemories.map(event => ({
    ...event,
    startAt: new Date(event.startAt),
    displayImage: event.coverImage || event.photos[0]?.url
  })).filter(e => e.displayImage); // Double check we have an image

  const firstName = member.firstName ?? member.email.split("@")[0];

  // Determine payment status using PaymentRequest (invoices) for THIS period
  const currentMembershipRequest = paymentRequestsRes.success && paymentRequestsRes.data
    ? paymentRequestsRes.data.find(r => {
      if (r.category !== "MEMBERSHIP_FEE") return false;
      // Use dueDate if exists, otherwise createdAt to determine period
      const d = r.dueDate || r.createdAt;
      const rPeriod = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return rPeriod === period;
    })
    : null;

  let paymentStatus: "PAID" | "NO_INVOICE" | "UNPAID_ACTIVE" | "UNPAID_OVERDUE";

  if (!currentMembershipRequest || currentMembershipRequest.status === "PAUSED") {
    paymentStatus = "NO_INVOICE";
  } else if (currentMembershipRequest.status === "PAID") {
    paymentStatus = "PAID";
  } else {
    // PENDING
    if (currentMembershipRequest.dueDate && new Date() > new Date(currentMembershipRequest.dueDate)) {
      paymentStatus = "UNPAID_OVERDUE";
    } else {
      paymentStatus = "UNPAID_ACTIVE";
    }
  }

  const todayStr = new Date().toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-8 min-w-0 overflow-x-hidden">

      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4 pt-1">
        <div>
          <h1
            className="text-3xl sm:text-4xl font-normal text-gray-900 leading-none"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            Hei, <em>{firstName}</em>
          </h1>
          <div className="flex items-center gap-3 mt-3">
            <div className="h-px w-8 bg-gray-300" />
            <p className="text-[11px] text-gray-400 italic" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
              &ldquo;Tidene forandres, men vi står støtt&rdquo;
            </p>
          </div>
        </div>
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest shrink-0 hidden sm:block">
          {todayStr}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">

        {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-8 min-w-0">

          {/* Hero Card (Next Event) */}
          {nextEvent ? (
            <Link
              href={`/events/${nextEvent.id}`}
              className="relative w-full h-[340px] sm:h-[320px] rounded-2xl overflow-hidden group block border border-gray-200 shadow-sm"
            >
              {nextEvent.coverImage ? (
                <Image
                  src={nextEvent.coverImage}
                  alt={nextEvent.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-gray-900" />
              )}

              {/* Layered gradients */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/25 to-transparent" />

              <div className="absolute inset-0 p-5 sm:p-7 flex flex-col justify-between text-white">
                {/* Top row */}
                <div className="flex justify-between items-start gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-white/15 backdrop-blur-md border border-white/20 text-white text-[9px] font-bold px-3 py-1.5 rounded-full uppercase tracking-[0.18em]">
                      Neste Samling
                    </span>
                    {nextEvent.category && (
                      <span className={`max-w-[140px] truncate backdrop-blur-md border text-[9px] font-bold px-2.5 py-1.5 rounded-full uppercase tracking-widest ${getCategoryColorClasses(nextEventColor).bg} ${getCategoryColorClasses(nextEventColor).text} ${getCategoryColorClasses(nextEventColor).border}`}>
                        {nextEvent.category}
                      </span>
                    )}
                  </div>
                  <EventCountdown targetDate={nextEvent.startAt} />
                </div>

                {/* Bottom content */}
                <div className="space-y-4">
                  <div>
                    <h2
                      className="text-2xl sm:text-3xl font-normal mb-2 leading-tight text-white"
                      style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                    >
                      {nextEvent.title}
                    </h2>
                    <p className="text-white/65 max-w-lg text-xs leading-relaxed line-clamp-2">
                      {nextEvent.description || "Gjør deg klar for årets høydepunkt."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {nextEvent.location && (
                      <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 min-w-0 shrink overflow-hidden">
                        <span className="material-symbols-outlined text-[14px] shrink-0 text-white/70">location_on</span>
                        <span className="font-medium text-[11px] truncate">
                          {nextEvent.location}
                        </span>
                      </div>
                    )}
                    <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 shrink-0">
                      <span className="material-symbols-outlined text-[14px] text-white/70">calendar_today</span>
                      <span className="font-medium text-[11px] whitespace-nowrap">
                        {nextEvent.startAt.toLocaleDateString("nb-NO", { day: "numeric", month: "long" })}
                      </span>
                    </div>
                    <span className={`inline-flex shrink-0 items-center justify-center gap-1.5 h-[38px] px-4 rounded-lg font-bold text-[11px] transition-all whitespace-nowrap ${
                      isUserSignedUpForNextEvent
                        ? "text-emerald-100 bg-emerald-500/20 border border-emerald-400/30"
                        : "text-white bg-white/15 border border-white/25 hover:bg-white/25 backdrop-blur-md"
                    }`}>
                      <span className="material-symbols-outlined text-[13px]">
                        {isUserSignedUpForNextEvent ? "task_alt" : "arrow_forward"}
                      </span>
                      {isUserSignedUpForNextEvent ? "Påmeldt" : "Meld deg på"}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div className="w-full h-[180px] rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 shadow-sm text-sm italic" style={{ fontFamily: "'Georgia', serif" }}>
              Ingen kommende arrangementer.
            </div>
          )}

          {/* ── Siste Nytt ──────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Siste Nytt</span>
              <div className="flex-1 h-px bg-gray-100" />
              <Link href="/posts" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider hover:text-gray-700 transition-colors">Se alle</Link>
            </div>

            <div className="flex flex-col gap-2">
              {posts.length === 0 && (
                <p className="text-xs text-gray-400 italic py-4" style={{ fontFamily: "'Georgia', serif" }}>Ingen innlegg ennå.</p>
              )}
              {posts.map(post => {
                const day = post.createdAt.toLocaleDateString("nb-NO", { day: "numeric" });
                const mon = post.createdAt.toLocaleDateString("nb-NO", { month: "short" }).replace(".", "").toUpperCase();
                return (
                  <Link
                    key={post.id}
                    href={`/posts/${post.id}`}
                    className="group flex items-stretch bg-white rounded-xl overflow-hidden border border-gray-200 hover:border-gray-400 hover:shadow-sm transition-all"
                  >
                    {/* Date column */}
                    <div className="flex flex-col items-center justify-center px-4 py-4 bg-gray-50 border-r border-gray-100 shrink-0 w-16">
                      <span
                        className="text-xl font-normal leading-none text-gray-900"
                        style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                      >
                        {day}
                      </span>
                      <span className="text-[9px] font-bold tracking-widest text-gray-400 mt-0.5">{mon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 px-4 py-3.5 flex flex-col justify-center">
                      <h4 className="font-bold text-sm text-gray-900 group-hover:text-gray-600 transition-colors leading-snug truncate">{post.title}</h4>
                      <p className="text-gray-500 text-xs leading-relaxed line-clamp-1 mt-0.5">{post.content}</p>
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center pr-4 text-gray-300 group-hover:text-gray-500 transition-colors">
                      <span className="material-symbols-outlined text-base">chevron_right</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ── Nylige Minner ───────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Nylige Minner</span>
              <div className="flex-1 h-px bg-gray-100" />
              <Link href="/gallery" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider hover:text-gray-700 transition-colors">Arkiv</Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {memories.length > 0 ? (
                memories.map((event) => (
                  <Link
                    key={event.id}
                    href={`/gallery/${event.id}`}
                    className="aspect-video rounded-xl overflow-hidden relative group block border border-gray-200"
                  >
                    <Image
                      src={event.displayImage!}
                      alt={event.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-300" />
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <p className="text-white text-[11px] font-bold leading-tight line-clamp-2 drop-shadow-sm">
                        {event.title}
                      </p>
                      <p className="text-[9px] font-bold text-white/50 mt-1 uppercase tracking-widest">
                        {event.startAt.getFullYear()}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-2 text-center py-8 rounded-xl border border-dashed border-gray-200">
                  <p className="text-xs text-gray-400 italic" style={{ fontFamily: "'Georgia', serif" }}>Ingen minner å vise enda.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN (Sidebar) ───────────────────────────── */}
        <div className="space-y-5 min-w-0">

          {/* Membership Card — dark */}
          <div
            className="rounded-2xl p-5 flex flex-col gap-5"
            style={{ background: "linear-gradient(145deg, #1a1a1a 0%, #111111 100%)", boxShadow: "0 4px 20px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">Medlemsstatus</span>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
                paymentStatus === "UNPAID_OVERDUE"
                  ? "bg-red-500/15 border border-red-500/25"
                  : "bg-emerald-500/15 border border-emerald-500/25"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${paymentStatus === "UNPAID_OVERDUE" ? "bg-red-400" : "bg-emerald-400"}`} />
                <span className={`text-[9px] font-bold uppercase tracking-wide ${paymentStatus === "UNPAID_OVERDUE" ? "text-red-300" : "text-emerald-300"}`}>
                  {paymentStatus === "PAID" || paymentStatus === "NO_INVOICE" ? "Aktivt" : "Inaktivt"}
                </span>
              </div>
            </div>

            <div className="h-px bg-white/8" />

            {/* Status rows */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Kontigent {period}</p>
                  <p className="font-bold text-gray-100 text-base leading-none" style={{ fontFamily: "'Georgia', serif" }}>
                    {paymentStatus === "PAID" ? "Betalt" : paymentStatus === "NO_INVOICE" ? "Ingen faktura" : paymentStatus === "UNPAID_ACTIVE" ? "Ikke betalt" : "Forfalt"}
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl material-symbols-outlined text-lg ${
                  paymentStatus === "UNPAID_OVERDUE"
                    ? "bg-red-500/15 text-red-400"
                    : paymentStatus === "UNPAID_ACTIVE"
                    ? "bg-amber-500/15 text-amber-400"
                    : "bg-white/10 text-gray-300"
                }`}>
                  {paymentStatus === "PAID" ? "check_circle" : paymentStatus === "NO_INVOICE" ? "receipt_long" : paymentStatus === "UNPAID_ACTIVE" ? "schedule" : "warning"}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Medlem siden</p>
                  <p className="font-bold text-gray-100 text-base leading-none" style={{ fontFamily: "'Georgia', serif" }}>
                    {member.createdAt.toLocaleDateString("nb-NO", { month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl material-symbols-outlined text-lg bg-white/10 text-gray-300">
                  verified
                </div>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Transaksjoner</span>
              <div className="flex-1 h-px bg-gray-100" />
              <Link href="/balance" className="text-[9px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-700 transition-colors">Se alle</Link>
            </div>
            <div className="divide-y divide-gray-100">
              {transactions.length > 0 ? (
                transactions.map((tx) => {
                  const isPositive = Number(tx.amount) > 0;
                  const absFormatted = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 }).format(Math.abs(Number(tx.amount)));
                  return (
                    <Link
                      key={tx.id}
                      href={`/balance/transactions/${tx.id}`}
                      className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-px ${isPositive ? "bg-emerald-400" : "bg-red-400"}`} />
                        <div className="min-w-0">
                          <span className="text-[12px] text-gray-800 group-hover:text-gray-600 transition-colors line-clamp-1 block leading-snug">{tx.description}</span>
                          <span className="text-[9px] text-gray-400">
                            {new Date(tx.date).toLocaleDateString("nb-NO", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-baseline gap-0.5 shrink-0 ml-3">
                        <span
                          className={`text-sm tabular-nums ${isPositive ? "text-emerald-600" : "text-gray-800"}`}
                          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                        >
                          {isPositive ? "+" : "−"}{absFormatted}
                        </span>
                        <span className="text-[9px] text-gray-400 ml-0.5">kr</span>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <p className="text-xs text-gray-400 italic py-4 px-4" style={{ fontFamily: "'Georgia', serif" }}>Ingen transaksjoner funnet.</p>
              )}
            </div>
          </div>

          {/* Kommende Fakturaer */}
          <div>
            <MyInvoices invoices={invoices} limit={4} />
          </div>

        </div>
      </div>
    </div>
  );
}
