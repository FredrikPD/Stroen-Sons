import Link from "next/link";
import Image from "next/image";
import { type Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { ensureMember } from "@/server/auth/ensureMember";
import { redirect } from "next/navigation";
import { withPrismaRetry } from "@/server/prismaResilience";

import { getMemberPaymentRequests } from "@/server/actions/payment-requests";
import { EventCountdownLarge } from "@/components/dashboard/EventCountdownLarge";

export const metadata = { title: "Hjem" };

const CONTAINER = "mx-auto w-full max-w-screen-xl px-4 sm:px-5 lg:px-6";
const SERIF = "'Georgia', 'Times New Roman', serif";

/* ── Queries ──────────────────────────────────────────────────── */

type NextEvent = Prisma.EventGetPayload<{ include: { _count: { select: { attendees: true } } } }>;
type FeedPost = Prisma.PostGetPayload<{
  include: { author: { select: { firstName: true; lastName: true } }; event: { select: { coverImage: true } } };
}>;
type MemoryEvent = Prisma.EventGetPayload<{ include: { photos: { select: { url: true } } } }>;

const getNextEvent = async (): Promise<NextEvent | null> =>
  (await prisma.event.findFirst({
    where: { startAt: { gte: new Date() } },
    orderBy: { startAt: "asc" },
    include: { _count: { select: { attendees: true } } },
  })) as unknown as NextEvent | null;

const getRecentPosts = async (): Promise<FeedPost[]> =>
  (await prisma.post.findMany({
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: 3,
    include: {
      author: { select: { firstName: true, lastName: true } },
      event: { select: { coverImage: true } },
    },
  })) as unknown as FeedPost[];

const getRecentMemories = async (): Promise<MemoryEvent[]> => {
  const events = await prisma.event.findMany({
    where: { startAt: { lt: new Date() }, photos: { some: {} } },
    orderBy: { startAt: "desc" },
    take: 4,
    include: { photos: { take: 1, orderBy: { createdAt: "desc" }, select: { url: true } } },
  });
  return events as unknown as MemoryEvent[];
};

function settled<T>(result: PromiseSettledResult<T>, fallback: T, label: string): T {
  if (result.status === "fulfilled") return result.value;
  console.error(`[dashboard] Failed to load ${label}:`, result.reason);
  return fallback;
}

/* ── Page ─────────────────────────────────────────────────────── */

export default async function DashboardPage() {
  let member;
  try {
    member = await ensureMember();
  } catch {
    redirect("/sign-in");
  }

  const settledData = await Promise.allSettled([
    withPrismaRetry(() => getNextEvent(), { operationName: "dashboard:getNextEvent" }),
    withPrismaRetry(() => getRecentPosts(), { operationName: "dashboard:getRecentPosts" }),
    getMemberPaymentRequests(member.id),
    withPrismaRetry(() => getRecentMemories(), { operationName: "dashboard:getRecentMemories" }),
    withPrismaRetry(
      () => prisma.transaction.findMany({ where: { memberId: member.id }, orderBy: { date: "desc" }, take: 4 }),
      { operationName: "dashboard:getRecentTransactions" }
    ),
  ] as const);

  const cachedNextEvent = settled(settledData[0], null, "next event");
  const cachedPosts = settled(settledData[1], [], "recent posts");
  const paymentRequestsRes = settled(
    settledData[2],
    { success: false as const, error: "Failed to fetch requests" },
    "payment requests"
  );
  const cachedMemories = settled(settledData[3], [], "recent memories");
  const cachedTransactions = settled(settledData[4], [], "recent transactions");

  const allRequests =
    paymentRequestsRes.success && paymentRequestsRes.data
      ? paymentRequestsRes.data.map((r) => ({
          ...r,
          dueDate: r.dueDate ? new Date(r.dueDate) : null,
          createdAt: new Date(r.createdAt),
        }))
      : [];

  const nextEvent = cachedNextEvent
    ? { ...cachedNextEvent, startAt: new Date(cachedNextEvent.startAt) }
    : null;

  let isSignedUp = false;
  if (nextEvent) {
    try {
      isSignedUp =
        (await withPrismaRetry(
          () => prisma.event.count({ where: { id: nextEvent.id, attendees: { some: { id: member.id } } } }),
          { operationName: "dashboard:isSignedUp" }
        )) > 0;
    } catch (e) {
      console.error("[dashboard] attendance check failed:", e);
    }
  }

  const posts = cachedPosts.map((p) => ({ ...p, createdAt: new Date(p.createdAt) }));
  const featured = posts[0] ?? null;
  const smallPosts = posts.slice(1, 3);

  const memories = cachedMemories
    .map((e) => ({ ...e, startAt: new Date(e.startAt), image: e.coverImage || e.photos[0]?.url }))
    .filter((e) => e.image);

  // Economy ────────────────────────────────────────────────
  const balance = Number(member.balance ?? 0);
  const balanceFmt = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 }).format(balance);

  // Unpaid invoices (soonest due first)
  const pendingRequests = [...allRequests]
    .filter((r) => r.status === "PENDING")
    .sort((a, b) => (a.dueDate ?? a.createdAt).getTime() - (b.dueDate ?? b.createdAt).getTime());
  const unpaidCount = pendingRequests.length;
  const unpaidInvoices = pendingRequests.slice(0, 3);

  const transactions = cachedTransactions.map((tx) => ({
    ...tx,
    date: new Date(tx.date),
    amount: Number(tx.amount),
  }));

  // Hero formatting ─────────────────────────────────────────
  const eventDate = nextEvent
    ? (() => {
        const d = nextEvent.startAt.toLocaleDateString("nb-NO", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        const t = nextEvent.startAt.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
        const cap = d.charAt(0).toUpperCase() + d.slice(1);
        return `${cap} · kl. ${t}`;
      })()
    : null;

  return (
    <div className="min-w-0">
      {/* ── HERO (full-bleed, dark) ─────────────────────────────── */}
      <section className="relative overflow-hidden text-white" style={{ background: "#0b0a09" }}>
        {nextEvent?.coverImage ? (
          /* Cover photo background + dark scrim so the text stays legible */
          <>
            <img
              src={nextEvent.coverImage}
              alt=""
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(11,10,9,0.95) 0%, rgba(11,10,9,0.88) 45%, rgba(11,10,9,0.58) 80%, rgba(11,10,9,0.42) 100%)",
              }}
            />
          </>
        ) : (
          /* Decorative watermark when there's no cover photo */
          <span
            aria-hidden
            className="pointer-events-none absolute -right-4 top-1/2 -translate-y-1/2 select-none leading-none text-white/[0.03]"
            style={{ fontFamily: SERIF, fontSize: "30rem" }}
          >
            S
          </span>
        )}

        <div className={CONTAINER + " relative grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 lg:gap-12 py-12 lg:py-16 items-center"}>
          {/* Left */}
          <div className="min-w-0">
            {nextEvent ? (
              <>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cream-muted/70 mb-4">
                  Neste sammenkomst
                </p>
                <h1
                  className="text-4xl sm:text-6xl font-normal leading-[1.02] text-white mb-5"
                  style={{ fontFamily: SERIF }}
                >
                  {nextEvent.title}
                </h1>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-400 mb-8">
                  <span className="inline-flex items-center gap-2">
                    <span className="material-symbols-outlined text-[1.05rem] text-gray-500">calendar_today</span>
                    {eventDate}
                  </span>
                  {nextEvent.location && (
                    <span className="inline-flex items-center gap-2">
                      <span className="material-symbols-outlined text-[1.05rem] text-gray-500">location_on</span>
                      {nextEvent.location}
                    </span>
                  )}
                </div>

                <div className="mb-9">
                  <EventCountdownLarge targetDate={nextEvent.startAt} />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/events/${nextEvent.id}`}
                    className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-white text-gray-900 text-[13px] font-bold hover:bg-gray-100 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[1.1rem]">description</span>
                    Se programmet
                  </Link>
                  {!isSignedUp && (
                    <Link
                      href={`/events/${nextEvent.id}`}
                      className="inline-flex items-center gap-2 h-11 px-5 rounded-lg border border-white/20 text-white text-[13px] font-bold hover:bg-white/10 transition-colors"
                    >
                      Meld deg på
                    </Link>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-gray-400 pl-1">
                    {isSignedUp && <span className="material-symbols-outlined text-[1.05rem] text-emerald-400">check_circle</span>}
                    {isSignedUp ? "Påmeldt" : "Påmeldte"}
                    <span className="text-gray-600">·</span>
                    <span className="text-gray-200 font-semibold">{nextEvent._count.attendees}</span>
                    {nextEvent.maxAttendees != null && (
                      <>
                        <span className="text-gray-600">/</span>
                        <span className="text-gray-400">{nextEvent.maxAttendees}</span>
                      </>
                    )}
                  </span>
                </div>
              </>
            ) : (
              <>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cream-muted/70 mb-4">Neste sammenkomst</p>
                <h1 className="text-4xl sm:text-5xl font-normal leading-tight text-white mb-4" style={{ fontFamily: SERIF }}>
                  Ingen kommende arrangementer
                </h1>
                <p className="text-gray-400 text-sm mb-8 max-w-md">
                  Det er ikke planlagt noen sammenkomster ennå. Følg med — nytt program kommer snart.
                </p>
                <Link
                  href="/events"
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-lg border border-white/20 text-white text-[13px] font-bold hover:bg-white/10 transition-colors"
                >
                  Se alle arrangementer
                  <span className="material-symbols-outlined text-[1.1rem]">arrow_forward</span>
                </Link>
              </>
            )}
          </div>

        </div>
      </section>

      {/* ── BODY (warm field) ───────────────────────────────────── */}
      <section className="bg-cream w-full">
        <div className={CONTAINER + " py-10 lg:py-14"}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-w-0">
            {/* LEFT — Fra foreningen */}
            <div className="lg:col-span-2 min-w-0">
              <div className="flex items-baseline justify-between gap-4 mb-6">
                <h2 className="text-2xl font-normal text-gray-900" style={{ fontFamily: SERIF }}>
                  Fra foreningen
                </h2>
                <Link href="/posts" className="text-[13px] font-semibold text-primary hover:text-primary-hover transition-colors inline-flex items-center gap-1">
                  Alle nyheter
                  <span className="material-symbols-outlined text-[1rem]">arrow_forward</span>
                </Link>
              </div>

              {featured ? (
                <Link
                  href={`/posts/${featured.id}`}
                  className="group block rounded-2xl overflow-hidden bg-card-bg border border-border-color hover:shadow-sm transition-all"
                >
                  {featured.event?.coverImage && (
                    <div className="relative aspect-[16/7] w-full overflow-hidden">
                      <Image
                        src={featured.event.coverImage}
                        alt={featured.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">{featured.category}</span>
                      <span className="text-[11px] text-gray-400">
                        {featured.createdAt.toLocaleDateString("nb-NO", { day: "numeric", month: "long" })}
                      </span>
                    </div>
                    <h3 className="text-2xl font-normal text-gray-900 leading-snug mb-2 group-hover:text-gray-600 transition-colors" style={{ fontFamily: SERIF }}>
                      {featured.title}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{featured.content}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 group-hover:text-gray-900 transition-colors">
                      Les innlegget
                      <span className="material-symbols-outlined text-[14px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                    </span>
                  </div>
                </Link>
              ) : (
                <div className="rounded-2xl border border-dashed border-border-color py-14 text-center">
                  <p className="text-sm text-gray-400 italic" style={{ fontFamily: SERIF }}>Ingen innlegg ennå.</p>
                </div>
              )}

              {smallPosts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 mt-8">
                  {smallPosts.map((post) => (
                    <Link key={post.id} href={`/posts/${post.id}`} className="group block p-4 rounded-xl bg-white/40 hover:bg-white/70 transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">{post.category}</span>
                        <span className="text-[11px] text-gray-400">
                          {post.createdAt.toLocaleDateString("nb-NO", { day: "numeric", month: "long" })}
                        </span>
                      </div>
                      <h4 className="text-lg font-normal text-gray-900 leading-snug mb-1.5 group-hover:text-gray-600 transition-colors" style={{ fontFamily: SERIF }}>
                        {post.title}
                      </h4>
                      <p className="text-[13px] text-gray-500 leading-relaxed line-clamp-2">{post.content}</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 group-hover:text-gray-900 transition-colors">
                        Les innlegget
                        <span className="material-symbols-outlined text-[14px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT — sidebar */}
            <div className="space-y-6 min-w-0">
              {/* Din økonomi */}
              <div className="rounded-2xl bg-card-bg border border-border-color overflow-hidden">
                <div className="flex items-center justify-between px-5 pt-5 pb-4">
                  <h3 className="text-lg font-normal text-gray-900" style={{ fontFamily: SERIF }}>Din økonomi</h3>
                  <Link href="/balance" className="text-[12px] font-semibold text-primary hover:text-primary-hover transition-colors inline-flex items-center gap-0.5">
                    Detaljer <span className="material-symbols-outlined text-[0.95rem]">chevron_right</span>
                  </Link>
                </div>

                <div className="flex items-center justify-between px-5 pb-5">
                  <span className="text-[13px] text-gray-500">Din saldo</span>
                  <span className="text-2xl font-normal text-gray-900 tabular-nums" style={{ fontFamily: SERIF }}>
                    kr {balanceFmt}
                  </span>
                </div>

                {/* Unpaid invoices */}
                {unpaidInvoices.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between px-5 py-2.5 bg-border-color border-y border-cream-muted/40">
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-secondary">Ubetalt</span>
                      <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                        {unpaidCount}
                      </span>
                    </div>
                    <div className="divide-y divide-border-color">
                      {unpaidInvoices.map((inv) => {
                        const overdue = inv.dueDate && inv.dueDate < new Date();
                        const dateStr = (inv.dueDate ?? inv.createdAt).toLocaleDateString("nb-NO", { day: "numeric", month: "long" });
                        return (
                          <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-black/[0.02] transition-colors group">
                            <div className="min-w-0 pr-3">
                              <p className="text-[13px] font-medium text-gray-900 truncate group-hover:text-gray-600 transition-colors">{inv.title}</p>
                              <p className={`text-[11px] mt-0.5 ${overdue ? "text-red-500" : "text-gray-400"}`}>
                                {overdue ? "Forfalt" : "Ubetalt"} · {dateStr}
                              </p>
                            </div>
                            <span className="text-base font-normal text-gray-900 tabular-nums shrink-0" style={{ fontFamily: SERIF }}>
                              kr {new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 }).format(inv.amount)}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recent transactions */}
                <div className="pb-2">
                  <div className="px-5 py-2.5 bg-border-color border-y border-cream-muted/40">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-secondary">Siste transaksjoner</span>
                  </div>
                  {transactions.length > 0 ? (
                    <div className="divide-y divide-border-color">
                      {transactions.map((tx) => {
                        const positive = tx.amount > 0;
                        const abs = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 }).format(Math.abs(tx.amount));
                        return (
                          <Link key={tx.id} href={`/balance/transactions/${tx.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-black/[0.02] transition-colors group">
                            <div className="min-w-0 pr-3">
                              <p className="text-[13px] font-medium text-gray-900 truncate group-hover:text-gray-600 transition-colors">{tx.description}</p>
                              <p className="text-[11px] mt-0.5 text-gray-400">
                                {tx.date.toLocaleDateString("nb-NO", { day: "numeric", month: "long" })}
                              </p>
                            </div>
                            <span className={`text-base font-normal tabular-nums shrink-0 ${positive ? "text-emerald-600" : "text-gray-900"}`} style={{ fontFamily: SERIF }}>
                              {positive ? "+" : "−"} kr {abs}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="px-5 py-3 text-[13px] text-gray-400 italic" style={{ fontFamily: SERIF }}>Ingen transaksjoner.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Minner ──────────────────────────────────────────── */}
          <div className="mt-14">
            <div className="flex items-baseline justify-between gap-4 mb-6">
              <h2 className="text-2xl font-normal text-gray-900" style={{ fontFamily: SERIF }}>Minner</h2>
              <Link href="/gallery" className="text-[13px] font-semibold text-primary hover:text-primary-hover transition-colors inline-flex items-center gap-1">
                Til galleriet
                <span className="material-symbols-outlined text-[1rem]">arrow_forward</span>
              </Link>
            </div>

            {memories.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {memories.map((e) => (
                  <Link key={e.id} href={`/gallery/${e.id}`} className="group relative aspect-video rounded-xl overflow-hidden block">
                    <Image src={e.image!} alt={e.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <p className="text-white text-[12px] font-semibold leading-tight line-clamp-2">{e.title}</p>
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/55 mt-1">{e.startAt.getFullYear()}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border-color py-12 text-center">
                <p className="text-sm text-gray-400 italic" style={{ fontFamily: SERIF }}>Ingen minner å vise ennå.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
