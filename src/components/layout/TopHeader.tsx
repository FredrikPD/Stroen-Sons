"use client";

import { usePathname } from "next/navigation";
import { MAIN_NAV, ACCOUNT_NAV, ADMIN_NAV } from "./nav";
import { useHeader } from "./HeaderContext";

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
  const { title: customTitle } = useHeader();

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
        <div className="hidden md:flex items-center gap-2 text-sm text-text-main">
          <span className={customTitle ? "font-normal text-gray-500" : "font-bold"}>{baseTitle}</span>
          {customTitle && (
            <>
              <span className="text-gray-300">/</span>
              <span className="font-bold">{customTitle}</span>
            </>
          )}
        </div>
      </div>

      {/* Right (Profile) */}
      <div className="flex items-center gap-5">
        <div className="h-6 w-px bg-gray-200" />

        <button className="relative text-gray-500 hover:text-[#4F46E5] transition-colors flex items-center">
          <span className="material-symbols-outlined text-[1.5rem]">notifications</span>
          <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-red-500 border border-white"></span>
        </button>

        <div className="h-9 w-9 rounded-full bg-[#222222] text-white flex items-center justify-center text-xs font-bold border border-gray-200 cursor-pointer shadow-sm hover:ring-2 hover:ring-[#4F46E5]/20 transition-all">
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