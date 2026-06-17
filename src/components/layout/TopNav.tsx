"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { MAIN_NAV, ACCOUNT_NAV, ADMIN_NAV } from "./nav";
import { useHeader } from "./HeaderContext";
import NotificationBell from "../notifications/NotificationBell";
import { resolveBack } from "./backNav";

const CONTAINER = "mx-auto w-full px-4 sm:px-5 lg:px-6";

function isItemActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

/* ── Avatar dropdown (account / admin / sign out) ─────────────── */

function AccountMenu({
  loading,
  userName,
  avatarUrl,
  role,
  userRole,
}: {
  loading: boolean;
  userName: string | null;
  avatarUrl: string | null;
  role?: string;
  userRole?: any;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { signOut } = useClerk();
  const { user } = useUser();

  const resolvedAvatarUrl = user?.imageUrl ?? avatarUrl;
  const resolvedName = user?.fullName ?? userName ?? "Bruker";
  const isAdmin = role === "ADMIN";
  const showAdmin =
    isAdmin ||
    role === "MODERATOR" ||
    (userRole?.allowedPaths && userRole.allowedPaths.length > 0);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const initials = (() => {
    const parts = resolvedName.split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return resolvedName.substring(0, 2).toUpperCase();
  })();

  const adminItems = ADMIN_NAV.filter((item) => {
    if (item.href === "/admin/dashboard") return false;
    if (isAdmin) return true;
    if (userRole?.allowedPaths && userRole.allowedPaths.length > 0) {
      return userRole.allowedPaths.some((pattern: string) => {
        try {
          return new RegExp(`^${pattern}$`).test(item.href);
        } catch {
          return false;
        }
      });
    }
    if (role === "MODERATOR") {
      return ["/admin/events", "/admin/posts", "/admin/photos"].includes(item.href);
    }
    return false;
  });

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Konto-meny"
        className="h-9 w-9 rounded-full overflow-hidden border border-white/15 shadow-sm hover:ring-2 hover:ring-white/20 transition-all shrink-0 cursor-pointer"
      >
        {loading || !userName ? (
          <div className="animate-pulse bg-white/10 w-full h-full" />
        ) : resolvedAvatarUrl ? (
          <img src={resolvedAvatarUrl} alt={resolvedName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-white/10 text-gray-100 flex items-center justify-center text-xs font-bold">
            {initials}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 ring-1 ring-black/5 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 bg-gray-50/60">
            <div className="size-9 rounded-full overflow-hidden shrink-0 bg-[#111111] text-white flex items-center justify-center text-[11px] font-bold">
              {resolvedAvatarUrl ? (
                <img src={resolvedAvatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-gray-900 truncate leading-tight">{resolvedName}</p>
              <p className="text-[11px] text-gray-400 truncate">{user?.primaryEmailAddress?.emailAddress || ""}</p>
            </div>
          </div>

          {/* Account links */}
          <div className="py-1.5">
            {ACCOUNT_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[1.1rem] text-gray-400">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Admin links */}
          {showAdmin && (
            <div className="py-1.5 border-t border-gray-100">
              <p className="px-4 pb-1 pt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-gray-300">Admin</p>
              <Link
                href="/admin/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[1.1rem] text-gray-400">admin_panel_settings</span>
                Dashboard
              </Link>
              {adminItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[1.1rem] text-gray-400">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          )}

          {/* Sign out */}
          <div className="py-1.5 border-t border-gray-100">
            <button
              type="button"
              onClick={() => signOut(() => router.push("/sign-in"))}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[1.1rem] scale-x-[-1]">logout</span>
              Logg ut
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Top navigation ───────────────────────────────────────────── */

export default function TopNav({
  loading,
  userName,
  avatarUrl,
  role,
  userRole,
  onMenuClick,
}: {
  loading: boolean;
  userName: string | null;
  avatarUrl: string | null;
  role?: string;
  userRole?: any;
  onMenuClick: () => void;
}) {
  const pathname = usePathname();
  const { backHref, backLabel } = useHeader();

  // A page may set a custom back target (HeaderContext); otherwise derive one
  // from the route so every page has a correct back button. See backNav.ts.
  const auto = resolveBack(pathname);
  const effHref = backHref ?? auto?.href ?? null;
  const effLabel = backLabel ?? auto?.label ?? null;

  return (
    <div className="shrink-0 z-30">
      {/* Primary dark nav */}
      <header
        className="h-[calc(3.75rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] text-gray-200"
        style={{ background: "#0f0e0c", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className={CONTAINER + " relative h-full grid grid-cols-[1fr_auto_1fr] items-center gap-4"}>
          {/* Left: back (sub-pages) + hamburger (mobile) + logo */}
          <div className="col-start-1 flex items-center gap-3 min-w-0 overflow-hidden justify-self-start">
            {effHref && (
              <Link
                href={effHref}
                aria-label={effLabel || "Tilbake"}
                className="group flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors min-w-0"
              >
                <span className="material-symbols-outlined text-[22px] group-hover:-translate-x-0.5 transition-transform">
                  arrow_back
                </span>
                <span className="hidden md:block text-[13px] font-medium truncate">
                  {effLabel || "Tilbake"}
                </span>
              </Link>
            )}
            {effHref && <span className="h-5 w-px bg-white/10" />}

            <button
              type="button"
              onClick={onMenuClick}
              aria-label="Åpne meny"
              className="lg:hidden text-gray-300 h-9 w-9 -ml-1.5 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>

            <Link href="/dashboard" className="flex items-center gap-3 shrink-0 group">
              <img
                src="/images/SS-Logo-2.png"
                alt="Strøen Søns"
                className="size-8 rounded-full object-cover shrink-0"
                style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.12), 0 0 0 3px rgba(255,255,255,0.05)" }}
              />
              <span
                className="hidden sm:block text-white text-[15px] tracking-[0.12em] uppercase whitespace-nowrap"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
              >
                Strøen Søns
              </span>
            </Link>
          </div>

          {/* Center: primary nav (desktop) */}
          <nav className="col-start-2 hidden lg:flex items-center gap-7 justify-self-center">
            {MAIN_NAV.map((item) => {
              const active = isItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative text-[13px] tracking-wide font-medium transition-colors whitespace-nowrap py-1 ${
                    active ? "text-white" : "text-gray-400 hover:text-gray-100"
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute -bottom-[3px] left-0 right-0 h-px bg-white/80 rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right: notifications + account */}
          <div className="col-start-3 flex items-center gap-3 sm:gap-4 shrink-0 justify-self-end">
            <NotificationBell variant="dark" />
            <AccountMenu
              loading={loading}
              userName={userName}
              avatarUrl={avatarUrl}
              role={role}
              userRole={userRole}
            />
          </div>
        </div>
      </header>
    </div>
  );
}
