"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { MAIN_NAV, ACCOUNT_NAV, ADMIN_NAV } from "./nav";
import { useHeader } from "./HeaderContext";
import NotificationBell from "../notifications/NotificationBell";

export default function TopHeader({
  loading,
  userName,
  avatarUrl,
  onMenuClick,
}: {
  loading: boolean;
  userName: string | null;
  avatarUrl: string | null;
  onMenuClick: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { title: customTitle, backHref, backLabel } = useHeader();

  const getPageTitle = () => {
    if (!pathname) return "Hjem";

    const allNavItems = [...MAIN_NAV, ...ACCOUNT_NAV, ...ADMIN_NAV];
    const sortedItems = allNavItems.sort((a, b) => b.href.length - a.href.length);

    const match = sortedItems.find((item) => pathname.startsWith(item.href) && item.href !== "/");

    if (!match && (pathname === "/" || pathname === "/dashboard")) return "Hjem";

    return match ? match.label : "Hjem";
  };

  const baseTitle = getPageTitle();

  return (
    <header className="sticky top-0 h-14 border-b border-border-color bg-background-header backdrop-blur-sm flex items-center justify-between px-6 lg:px-10 shrink-0 z-20">
      {/* Left (Path) */}
      <div className="flex items-center gap-4">
        {/* Hamburger (mobile) */}
        <button
          type="button"
          onClick={() => { onMenuClick(); }}
          aria-label="Open menu"
          className="lg:hidden text-text-main"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        {/* Path (Desktop) */}
        {/* Path (Desktop) */}
        <div className="hidden md:flex items-center gap-2 text-sm text-text-main">
          {pathname === "/admin/access-denied" ? null : (
            backHref ? (
              // Explicit back link from context
              <Link
                href={backHref}
                className="flex items-center gap-1 cursor-pointer text-gray-500 hover:text-gray-900 transition-colors font-medium"
              >
                <span className="material-symbols-outlined text-[1.2rem]">arrow_back</span>
                <span>{backLabel || "Tilbake"}</span>
              </Link>
            ) : (
              // Standard logic
              (() => {
                const allNavItems = [...MAIN_NAV, ...ACCOUNT_NAV, ...ADMIN_NAV];
                const sortedItems = allNavItems.sort((a, b) => b.href.length - a.href.length);
                // Ignore strict matches (current page) to find parent
                const parent = sortedItems.find((item) => pathname.startsWith(item.href) && pathname !== item.href && item.href !== "/");

                if (parent) {
                  return (
                    <Link
                      href={parent.href}
                      className="flex items-center gap-1 cursor-pointer text-gray-500 hover:text-gray-900 transition-colors font-medium"
                    >
                      <span className="material-symbols-outlined text-[1.2rem]">arrow_back</span>
                      <span>{parent.label}</span>
                    </Link>
                  )
                }

                // Fallback: Just show current page title (static)
                return <span className="font-bold">{baseTitle}</span>
              })()
            )
          )}
        </div>
      </div>

      {/* Right (Profile) */}
      <div className="flex items-center gap-5">
        <div className="h-6 w-px bg-gray-200" />

        <NotificationBell />

        <div
          onClick={() => router.push("/account")}
          className="h-9 w-9 rounded-full bg-[#222222] text-white flex items-center justify-center text-xs font-bold border border-gray-200 cursor-pointer shadow-sm hover:ring-2 hover:ring-[#4F46E5]/20 transition-all"
        >
          {loading || !userName ? (
            <div className="animate-pulse bg-white/20 w-full h-full rounded-full" />
          ) : (
            (() => {
              const parts = userName.split(" ");
              if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
              return userName.substring(0, 2).toUpperCase();
            })()
          )}
        </div>
      </div>
    </header>
  );
}