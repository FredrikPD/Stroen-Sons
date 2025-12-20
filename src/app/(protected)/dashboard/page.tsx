import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/server/db";
import { ensureMember } from "@/server/auth/ensureMember";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";

import { MyInvoices } from "@/components/dashboard/MyInvoices";
import { getMemberPaymentRequests } from "@/server/actions/payment-requests";

function currentPeriod() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const getNextEvent = unstable_cache(
  async () => {
    return prisma.event.findFirst({
      where: { startAt: { gte: new Date() } },
      orderBy: { startAt: "asc" },
    });
  },
  ["dashboard-next-event"],
  { revalidate: 3600, tags: ["events"] }
);

const getRecentPosts = unstable_cache(
  async () => {
    return prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { author: { select: { firstName: true, lastName: true } } },
    });
  },
  ["dashboard-recent-posts"],
  { revalidate: 3600, tags: ["posts"] }
);

const getRecentMemories = unstable_cache(
  async () => {
    return prisma.event.findMany({
      where: {
        startAt: { lt: new Date() },
        coverImage: { not: null },
      },
      orderBy: { startAt: "desc" },
      take: 4,
    });
  },
  ["dashboard-recent-memories"],
  { revalidate: 3600, tags: ["events"] }
);

export default async function DashboardPage() {
  let member;
  try {
    member = await ensureMember();
  } catch (error) {
    redirect("/sign-in");
  }

  const period = currentPeriod();

  const [cachedNextEvent, payment, cachedPosts, transactions, paymentRequestsRes, cachedMemories] = await Promise.all([
    getNextEvent(),
    prisma.payment.findUnique({
      where: { memberId_period: { memberId: member.id, period } },
    }),
    getRecentPosts(),
    prisma.transaction.findMany({
      where: { memberId: member.id },
      orderBy: { date: "desc" },
      take: 3,
    }),
    getMemberPaymentRequests(member.id),
    getRecentMemories()
  ]);

  const unpaidInvoices = paymentRequestsRes.success && paymentRequestsRes.data
    ? paymentRequestsRes.data.filter(r => r.status === 'PENDING').map(r => ({
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

  const posts = cachedPosts.map(post => ({
    ...post,
    createdAt: new Date(post.createdAt)
  }));

  const memories = cachedMemories.map(event => ({
    ...event,
    startAt: new Date(event.startAt)
  }));

  const firstName = member.firstName ?? member.email.split("@")[0];
  const paymentStatus = payment?.status ?? "UNPAID";

  return (
    <div className="flex flex-col gap-8">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">
          Hei, {firstName}
        </h1>
        <p className="text-gray-500 text-sm">
          "Tidene forandres, men vi står støtt"
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN (Content) */}
        <div className="lg:col-span-2 space-y-8">

          {/* Hero Card (Next Event) */}
          {nextEvent ? (
            <Link href={`/events/${nextEvent.id}`} className="relative w-full h-[320px] rounded-2xl overflow-hidden shadow-sm group block border border-gray-200">
              {/* Background Image */}
              {nextEvent.coverImage ? (
                <Image
                  src={nextEvent.coverImage}
                  alt={nextEvent.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-neutral-900" />
              )}

              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Content */}
              <div className="absolute inset-0 p-8 flex flex-col justify-between text-white">
                <div className="flex justify-between items-start">
                  <span className="bg-white/20 backdrop-blur-md border border-white/10 text-white text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
                    Neste Samling
                  </span>

                  {/* Mock Countdown Widget */}
                  <div className="flex gap-2">
                    <div className="bg-white/10 backdrop-blur-md rounded-lg p-1.5 text-center min-w-[50px]">
                      <span className="block text-xl font-bold leading-none">14</span>
                      <span className="text-[9px] uppercase text-white/70">Dager</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold mb-2 leading-tight text-white drop-shadow-sm">
                      {nextEvent.title}
                    </h2>
                    <p className="text-white/90 max-w-lg text-base font-medium leading-relaxed drop-shadow-sm">
                      {nextEvent.description || "Gjør deg klar for årets høydepunkt."}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-5 bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">calendar_today</span>
                        <span className="font-semibold text-sm">
                          {nextEvent.startAt.toLocaleDateString("nb-NO", { day: 'numeric', month: 'long' })}
                        </span>
                      </div>
                      <div className="w-px h-5 bg-white/20" />
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">schedule</span>
                        <span className="font-semibold text-sm">
                          {nextEvent.startAt.toLocaleTimeString("nb-NO", { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {nextEvent.location && (
                        <>
                          <div className="w-px h-5 bg-white/20" />
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">location_on</span>
                            <span className="font-semibold text-sm">{nextEvent.location}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <span className="bg-[#4F46E5] hover:bg-[#4338ca] text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-lg shadow-[#4F46E5]/20">
                      Meld deg på
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div className="w-full h-[200px] rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 shadow-sm">
              Ingen kommende arrangementer.
            </div>
          )}

          <MyInvoices invoices={unpaidInvoices} />

          {/* Siste Nytt (News Feed) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Siste Nytt</h3>
              <Link href="/posts" className="text-[#4F46E5] text-sm font-semibold hover:underline">Se alle</Link>
            </div>

            <div className="grid gap-4">
              {posts.map(post => (
                <Link key={post.id} href={`/posts/${post.id}`} className="bg-white border border-gray-200 p-5 rounded-2xl flex items-start gap-4 hover:border-[#4F46E5]/50 transition-all cursor-pointer group shadow-sm hover:shadow-md block">
                  <div className="bg-gray-50 p-3 rounded-xl text-gray-400 group-hover:text-[#4F46E5] group-hover:bg-[#4F46E5]/10 transition-colors">
                    <span className="material-symbols-outlined text-xl">article</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-1">
                      <h4 className="font-bold text-base text-gray-900 truncate pr-4 group-hover:text-[#4F46E5] transition-colors">{post.title}</h4>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {post.createdAt.toLocaleDateString("nb-NO", { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">{post.content}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (Sidebar) */}
        <div className="space-y-6">

          {/* Status Card & Transactions */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Medlemsstatus</h4>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${paymentStatus === "PAID"
                ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                : "bg-red-50 border-red-100 text-red-700"
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${paymentStatus === "PAID" ? "bg-emerald-500" : "bg-red-500"}`} />
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  {paymentStatus === "PAID" ? "Betalt kontigent" : "Ubetalt kontigent"}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl material-symbols-outlined text-xl">
                  payments
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-0.5">Kontigent {period}</p>
                  <p className="text-gray-900 font-bold text-xl">
                    {paymentStatus === "PAID" ? "Betalt" : "Ikke betalt"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-gray-50 text-gray-400 p-3 rounded-xl material-symbols-outlined text-xl">
                  verified
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-0.5">Medlem siden</p>
                  <p className="text-gray-900 font-bold text-xl">
                    {member.createdAt.toLocaleDateString("nb-NO", { month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full h-px bg-gray-100" />

            {/* Recent Transactions */}
            <div>
              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Siste Transaksjoner</h4>
              <div className="space-y-3">
                {transactions.length > 0 ? (
                  transactions.map((tx) => {
                    const isPositive = Number(tx.amount) > 0;
                    return (
                      <div key={tx.id} className="flex items-center justify-between text-sm group p-2 hover:bg-gray-50 rounded-lg transition-colors -mx-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            <span className="material-symbols-outlined text-base">
                              {isPositive ? "arrow_upward" : "arrow_downward"}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900 group-hover:text-[#4F46E5] transition-colors line-clamp-1">{tx.description}</span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(tx.date).toLocaleDateString("nb-NO", { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        </div>
                        <span className={`font-mono font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isPositive ? "+" : ""}
                          {new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(Number(tx.amount))}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-gray-400 italic">Ingen transaksjoner funnet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Nylige Minner */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Nylige Minner</h3>
              <Link href="/gallery" className="text-[#4F46E5] text-xs font-bold hover:underline">Arkiv</Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {memories.length > 0 ? (
                memories.map((event) => (
                  <Link key={event.id} href={`/gallery/${event.id}`} className="aspect-square bg-gray-100 rounded-2xl overflow-hidden relative group cursor-pointer border border-gray-200 block">
                    <Image
                      src={event.coverImage!}
                      alt={event.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 pt-12 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-white text-xs font-bold leading-tight line-clamp-2 drop-shadow-sm">
                        {event.title}
                      </p>
                      <p className="text-[10px] text-white/70 font-medium mt-0.5 uppercase tracking-wider">
                        {event.startAt.getFullYear()}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-2 text-center py-6 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                  <p className="text-sm text-gray-400 italic">Ingen minner å vise enda.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}