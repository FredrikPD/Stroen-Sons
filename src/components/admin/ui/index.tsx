import { ReactNode } from "react";

/* ──────────────────────────────────────────────────────────────────────────
   Shared admin UI primitives.

   These centralise the editorial-warm design language used across the member
   surfaces (dashboard, posts, events, members, gallery) so every admin page
   renders the same serif headers, warm palette, and dark CTAs instead of the
   old generic-SaaS look. Import from "@/components/admin/ui".
   ────────────────────────────────────────────────────────────────────────── */

/** Georgia serif stack used for all display headings. Mirrors the member pages. */
export const SERIF = "'Georgia', 'Times New Roman', serif";

/* ── Reusable className strings ─────────────────────────────────────────────
   Prefer these over ad-hoc utility soup so the whole admin surface stays
   consistent. Compose with template strings when a page needs extras. */

/** Solid dark CTA — the primary admin action button. */
export const btnPrimary =
    "inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg bg-[#0f0e0c] text-white text-[12px] font-bold hover:bg-[#0f0e0c]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

/** Quiet bordered button — secondary actions (cancel, back, etc.). */
export const btnSecondary =
    "inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg border border-border-color bg-white text-gray-700 text-[12px] font-bold hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

/** Destructive button — irreversible actions. Red stays semantic. */
export const btnDanger =
    "inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg bg-red-600 text-white text-[12px] font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

/** Standard surface card. */
export const card = "rounded-2xl bg-white border border-border-color";

/** Interactive surface card (links, clickable rows-as-cards). */
export const cardHover =
    "rounded-2xl bg-white border border-border-color hover:border-gray-300 hover:shadow-sm transition-all";

/** Form field label — uppercase warm eyebrow. */
export const label =
    "block text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-1.5";

/** Text / number input, select, and textarea share this base. */
export const input =
    "w-full h-11 px-3.5 rounded-xl border border-border-color bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors";

/** Textarea variant (auto height). */
export const textarea =
    "w-full px-3.5 py-2.5 rounded-xl border border-border-color bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors";

/** Quiet "see all / details" link in warm gold. */
export const seeAllLink =
    "text-[13px] font-semibold text-primary hover:text-primary-hover transition-colors inline-flex items-center gap-1";

/* ── Components ─────────────────────────────────────────────────────────── */

/**
 * Page header used at the top of every admin page.
 * Uppercase eyebrow → serif h1 → optional description → hairline separator,
 * with an optional right-aligned actions slot (CTA buttons, filters).
 * Back navigation is handled globally by TopNav — do not add it here.
 */
export function AdminPageHeader({
    eyebrow,
    title,
    description,
    actions,
    className = "",
}: {
    eyebrow?: string;
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
    className?: string;
}) {
    return (
        <div className={`mb-8 ${className}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    {eyebrow && (
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">
                            {eyebrow}
                        </p>
                    )}
                    <h1
                        className="text-3xl sm:text-4xl font-normal text-gray-900 leading-none"
                        style={{ fontFamily: SERIF }}
                    >
                        {title}
                    </h1>
                    {description && (
                        <p className="mt-3 text-sm text-text-secondary max-w-2xl leading-relaxed">
                            {description}
                        </p>
                    )}
                </div>
                {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
            </div>
            <div className="h-px bg-gray-300 mt-5" />
        </div>
    );
}

/**
 * Dark hero panel for admin landing pages (dashboard, portal hubs).
 * Mirrors the member dashboard's dark hero: warm-black gradient, faint serif
 * "S" watermark, serif greeting, and an optional divided KPI strip. This is the
 * high-contrast anchor that keeps a warm page from reading as one flat tone.
 */
export function AdminHero({
    eyebrow,
    title,
    subtitle,
    stats,
    children,
}: {
    eyebrow?: string;
    title: string;
    subtitle?: ReactNode;
    stats?: Array<{ icon: string; label: string; value: ReactNode; sub?: ReactNode; valueClass?: string }>;
    children?: ReactNode;
}) {
    return (
        <section
            className="relative overflow-hidden rounded-2xl text-white px-6 py-6 sm:px-8 sm:py-7"
            style={{ background: "linear-gradient(150deg, #1b1a16 0%, #0b0a09 62%)" }}
        >
            <span
                aria-hidden
                className="pointer-events-none absolute -right-2 top-1/2 -translate-y-1/2 select-none leading-none text-white/[0.035]"
                style={{ fontFamily: SERIF, fontSize: "15rem" }}
            >
                S
            </span>

            <div className="relative min-w-0">
                {eyebrow && (
                    <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cream-muted/75 mb-2">
                        {eyebrow}
                    </p>
                )}
                <h1
                    className="text-3xl sm:text-4xl font-normal leading-[1.05] text-white"
                    style={{ fontFamily: SERIF }}
                >
                    {title}
                </h1>
                {subtitle && (
                    <p className="mt-2 text-sm text-gray-400 max-w-2xl leading-relaxed">{subtitle}</p>
                )}

                {stats && stats.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
                        {stats.map((s, i) => (
                            <div
                                key={i}
                                className="min-w-0 sm:pl-5 sm:border-l sm:border-white/10 sm:first:border-l-0 sm:first:pl-0"
                            >
                                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-cream-muted mb-2">
                                    <span className="material-symbols-outlined text-[15px] text-primary">
                                        {s.icon}
                                    </span>
                                    <span className="truncate">{s.label}</span>
                                </div>
                                <div
                                    className={`text-[26px] font-normal leading-none tabular-nums truncate ${s.valueClass ?? "text-white"}`}
                                    style={{ fontFamily: SERIF }}
                                >
                                    {s.value}
                                </div>
                                {s.sub && <div className="text-[11px] text-gray-500 mt-1.5 truncate">{s.sub}</div>}
                            </div>
                        ))}
                    </div>
                )}

                {children}
            </div>
        </section>
    );
}

/**
 * Section heading within a page: serif h2 with an optional right-aligned
 * action (a "see all" link, a count, a small button).
 */
export function AdminSectionHeader({
    title,
    action,
    className = "",
}: {
    title: string;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div className={`flex items-baseline justify-between gap-4 mb-4 ${className}`}>
            <h2 className="text-2xl font-normal text-gray-900" style={{ fontFamily: SERIF }}>
                {title}
            </h2>
            {action}
        </div>
    );
}

/** Dashed italic-serif empty state placeholder. */
export function AdminEmptyState({
    children,
    icon,
    className = "",
}: {
    children: ReactNode;
    icon?: string;
    className?: string;
}) {
    return (
        <div
            className={`rounded-2xl border border-dashed border-border-color py-14 text-center ${className}`}
        >
            {icon && (
                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2 block">
                    {icon}
                </span>
            )}
            <p className="text-sm text-gray-400 italic" style={{ fontFamily: SERIF }}>
                {children}
            </p>
        </div>
    );
}
