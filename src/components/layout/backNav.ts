/**
 * Central back-button resolver.
 *
 * Maps any pathname to the logical "up" target shown by the header back button
 * (see TopNav). A page may still override this by setting `backHref`/`backLabel`
 * via the HeaderContext (SetHeader / PageTitleUpdater) — that always wins. This
 * resolver is the fallback so that *every* route gets a correct, labelled back
 * button without per-route wiring, including routes added in the future.
 *
 * Targets are always static, navigable paths (list / section pages). Dynamic
 * segments in a route pattern are written as "[x]" and match any single segment.
 * Labels are Norwegian and mirror the nav labels where a destination has one.
 */

export type BackTarget = { href: string; label: string };

// Route pattern → [backHref, backLabel]. Order-independent: matched most-specific
// first (deeper paths and static segments win) via the sort below.
const RAW: Array<[pattern: string, href: string, label: string]> = [
    // ── Member surfaces ───────────────────────────────────────────────
    ["/posts/[postId]", "/posts", "Nyheter"],
    ["/events/[id]", "/events", "Arrangementer"],
    ["/gallery/[id]", "/gallery", "Bildearkiv"],
    ["/invoices/[id]", "/balance", "Saldo & Økonomi"],
    ["/balance/transactions/[id]", "/balance", "Saldo & Økonomi"],

    ["/invoices", "/balance", "Saldo & Økonomi"],

    // ── Admin: content ────────────────────────────────────────────────
    ["/admin/events/[id]/edit", "/admin/events", "Arrangementer"],
    ["/admin/events/[id]/recap", "/admin/events", "Arrangementer"],
    ["/admin/events/new", "/admin/events", "Arrangementer"],
    ["/admin/posts/[id]/edit", "/admin/posts", "Innlegg"],
    ["/admin/posts/new", "/admin/posts", "Innlegg"],
    ["/admin/events", "/admin/dashboard", "Dashboard"],
    ["/admin/posts", "/admin/dashboard", "Dashboard"],
    ["/admin/photos", "/admin/dashboard", "Dashboard"],

    // ── Admin: finance ────────────────────────────────────────────────
    ["/admin/finance/invoices/create", "/admin/finance/invoices", "Fakturaer"],
    ["/admin/finance/invoices/[title]", "/admin/finance/invoices", "Fakturaer"],
    ["/admin/finance/transactions/[id]", "/admin/finance/transactions", "Transaksjonshistorikk"],
    ["/admin/finance/balance", "/admin/finance", "Økonomi"],
    ["/admin/finance/expenses", "/admin/finance", "Økonomi"],
    ["/admin/finance/income", "/admin/finance", "Økonomi"],
    ["/admin/finance/invoices", "/admin/finance", "Økonomi"],
    ["/admin/finance/reports", "/admin/finance", "Økonomi"],
    ["/admin/finance/transactions", "/admin/finance", "Økonomi"],
    ["/admin/finance", "/admin/dashboard", "Dashboard"],

    // ── Admin: system ─────────────────────────────────────────────────
    ["/admin/system/user-roles/new", "/admin/system/user-roles", "Brukerroller"],
    ["/admin/system/user-roles/[id]", "/admin/system/user-roles", "Brukerroller"],
    ["/admin/system/user-roles", "/admin/system", "System"],
    ["/admin/system/categories", "/admin/system", "System"],
    ["/admin/system/delete-invoices", "/admin/system", "System"],
    ["/admin/system/delete-transactions", "/admin/system", "System"],
    ["/admin/system/event-categories", "/admin/system", "System"],
    ["/admin/system/event-participation", "/admin/system", "System"],
    ["/admin/system/membership-types", "/admin/system", "System"],
    ["/admin/system/photos", "/admin/system", "System"],
    ["/admin/system/resource-manager", "/admin/system", "System"],
    ["/admin/system/set-balance", "/admin/system", "System"],
    ["/admin/system/delete", "/admin/users", "Brukere"],
    ["/admin/system", "/admin/dashboard", "Dashboard"],

    // ── Admin: users ──────────────────────────────────────────────────
    ["/admin/users/invitations", "/admin/users", "Brukere"],
    ["/admin/users/invite", "/admin/users", "Brukere"],
    ["/admin/users/roles", "/admin/users", "Brukere"],
    ["/admin/users", "/admin/dashboard", "Dashboard"],

    // ── Admin: roots ──────────────────────────────────────────────────
    ["/admin/access-denied", "/admin/dashboard", "Dashboard"],
    ["/admin/dashboard", "/dashboard", "Hjem"],
    ["/admin", "/dashboard", "Hjem"],
];

// Top-level navigation roots (reached directly from the main nav / account menu)
// have no meaningful "up" target, so they show no back button. Their sub-pages
// (e.g. /events/[id], /balance/transactions/[id]) still resolve via RULES.
const NO_BACK = new Set([
    "/",
    "/dashboard",
    "/posts",
    "/events",
    "/gallery",
    "/scoreboard",
    "/members",
    "/about",
    "/account",
    "/my-events",
    "/balance",
]);

function toRegex(pattern: string): RegExp {
    // Replace dynamic segments ("[id]", "[postId]", "[title]") with a single-segment matcher.
    return new RegExp("^" + pattern.replace(/\[[^/\]]+\]/g, "[^/]+") + "$");
}

const RULES = RAW.map(([pattern, href, label]) => ({
    href,
    label,
    depth: pattern.split("/").filter(Boolean).length,
    dynamic: pattern.includes("["),
    regex: toRegex(pattern),
}))
    // Most-specific first: deeper paths win, and static beats dynamic at equal depth.
    .sort((a, b) => b.depth - a.depth || Number(a.dynamic) - Number(b.dynamic));

export function resolveBack(pathname: string | null | undefined): BackTarget | null {
    if (!pathname) return null;
    const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
    if (NO_BACK.has(path)) return null;

    for (const rule of RULES) {
        if (rule.regex.test(path)) return { href: rule.href, label: rule.label };
    }

    // Generic fallback for any unmapped (e.g. future) route: drop the last segment.
    const segs = path.split("/").filter(Boolean);
    if (segs.length <= 1) return { href: "/dashboard", label: "Hjem" };
    return { href: "/" + segs.slice(0, -1).join("/"), label: "Tilbake" };
}
