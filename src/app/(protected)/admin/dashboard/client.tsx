"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { LoadingState } from "@/components/ui/LoadingState";
import { AdminHero, AdminSectionHeader, SERIF } from "@/components/admin/ui";
import type { AdminDashboardData } from "@/lib/admin-dashboard";

/* ── Navigational action card with access-control (enabled / locked) states ── */
function ActionCard({
    href,
    icon,
    title,
    description,
    cta,
    allowed,
}: {
    href: string;
    icon: string;
    title: string;
    description: string;
    cta: string;
    allowed: boolean;
}) {
    if (!allowed) {
        return (
            <div className="rounded-2xl bg-white/45 border border-dashed border-border-color p-5 flex flex-col justify-between min-h-[178px] opacity-80">
                <div>
                    <div className="w-[42px] h-[42px] rounded-xl bg-[#ece7db] flex items-center justify-center text-[#b8b0a0] mb-3.5">
                        <span className="material-symbols-outlined text-[21px]">{icon}</span>
                    </div>
                    <h3 className="text-lg font-normal text-[#a49c8d] mb-1" style={{ fontFamily: SERIF }}>
                        {title}
                    </h3>
                    <p className="text-[13px] text-gray-400 leading-relaxed">{description}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#b8b0a0]">
                    <span className="material-symbols-outlined text-[14px]">lock</span>
                    Ingen tilgang
                </span>
            </div>
        );
    }

    return (
        <Link
            href={href}
            className="group rounded-2xl bg-white border border-border-color p-5 flex flex-col justify-between min-h-[178px] hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-[0_6px_22px_rgba(75,58,30,0.08)] transition-all"
        >
            <div>
                <div className="w-[42px] h-[42px] rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3.5 group-hover:bg-[#0f0e0c] group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[21px]">{icon}</span>
                </div>
                <h3 className="text-lg font-normal text-gray-900 mb-1" style={{ fontFamily: SERIF }}>
                    {title}
                </h3>
                <p className="text-[13px] text-text-secondary leading-relaxed">{description}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-primary group-hover:gap-2.5 transition-all">
                {cta}
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </span>
        </Link>
    );
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function AdminDashboardClientPage({ initialData }: { initialData?: AdminDashboardData | null }) {
    const { data, loading, error } = useAdminDashboard(initialData);

    if (loading) {
        return <LoadingState />;
    }

    if (error) {
        return (
            <div className="py-16 text-center">
                <h1 className="text-2xl font-normal text-gray-900 mb-3" style={{ fontFamily: SERIF }}>
                    Tilgang nektet
                </h1>
                <p className="text-sm text-text-secondary mb-5">{error}</p>
                <Link
                    href="/dashboard"
                    className="text-[13px] font-semibold text-primary hover:text-primary-hover transition-colors"
                >
                    Gå til min side
                </Link>
            </div>
        );
    }

    const hasAccess = (path: string) => {
        if (!data) return false;
        if (data.role === "ADMIN") return true;

        // Legacy moderator check
        if (data.role === "MODERATOR") {
            const allowed = ["/admin", "/admin/events", "/admin/posts", "/admin/photos"];
            return allowed.includes(path);
        }

        // Dynamic userRole check
        if (data.userRole?.allowedPaths && data.userRole.allowedPaths.length > 0) {
            return data.userRole.allowedPaths.some((pattern: string) => {
                try {
                    return new RegExp(`^${pattern}$`).test(path);
                } catch { return false; }
            });
        }

        return false;
    };

    const monthLabel = new Date().toLocaleString("nb-NO", { month: "long" });
    const currency = (n: number) =>
        new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(n);

    // Unpaid-fees KPI has three states: not-generated (-1), all-paid (0), unpaid (>0).
    const unpaidState =
        data?.unpaidCount === -1 ? "none" : (data?.unpaidCount ?? 0) === 0 ? "paid" : "unpaid";

    const unpaidStat =
        unpaidState === "none"
            ? {
                  icon: "receipt_long",
                  label: `Faktura (${monthLabel})`,
                  value: <span className="text-xl">Ingen</span>,
                  sub: "Ikke generert",
                  valueClass: "text-gray-400",
              }
            : unpaidState === "paid"
              ? {
                    icon: "check_circle",
                    label: `Ubetalt (${monthLabel})`,
                    value: <span className="text-xl">Alle betalt</span>,
                    valueClass: "text-emerald-400",
                }
              : {
                    icon: "warning",
                    label: `Ubetalt (${monthLabel})`,
                    value: `${data?.unpaidCount ?? 0} stk`,
                    valueClass: "text-amber-400",
                };

    return (
        <div>
            <AdminHero
                eyebrow="Administrasjon"
                title={`Velkommen, ${data?.firstName ?? "Administrator"}`}
                subtitle="Her er en oversikt over klubbens status og dine administrative verktøy."
                stats={[
                    { icon: "group", label: "Medlemmer", value: data?.memberCount ?? 0 },
                    {
                        icon: "calendar_month",
                        label: "Neste",
                        value: (
                            <span className="text-xl">{data?.nextEvent ? data.nextEvent.title : "Ingen planlagt"}</span>
                        ),
                        sub: data?.nextEvent
                            ? new Date(data.nextEvent.startAt).toLocaleDateString("nb-NO", {
                                  day: "numeric",
                                  month: "long",
                              })
                            : "—",
                    },
                    {
                        icon: "account_balance_wallet",
                        label: "Kasse",
                        value: currency(data?.treasuryBalance ?? 0),
                        sub: "Tilgjengelig",
                    },
                    unpaidStat,
                ]}
            />

            {/* Quick actions */}
            <div className="mt-12">
                <AdminSectionHeader title="Administrer" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ActionCard
                        href="/admin/events"
                        icon="calendar_month"
                        title="Arrangementer"
                        description="Se oversikt og administrer alle arrangementer."
                        cta="Til arrangementer"
                        allowed={hasAccess("/admin/events")}
                    />
                    <ActionCard
                        href="/admin/posts"
                        icon="post_add"
                        title="Innlegg"
                        description="Administrer nyheter og innlegg."
                        cta="Til innlegg"
                        allowed={hasAccess("/admin/posts")}
                    />
                    <ActionCard
                        href="/admin/photos"
                        icon="cloud_upload"
                        title="Bilder"
                        description="Last opp eller slett bilder fra arkivet."
                        cta="Til bilder"
                        allowed={hasAccess("/admin/photos")}
                    />
                    <ActionCard
                        href="/admin/users"
                        icon="manage_accounts"
                        title="Brukere"
                        description="Inviter, slett eller endre roller."
                        cta="Til brukere"
                        allowed={hasAccess("/admin/users")}
                    />
                </div>
            </div>
        </div>
    );
}
