"use client";

import Link from "next/link";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { MAIN_NAV, ACCOUNT_NAV, ADMIN_NAV, type NavItem } from "./nav";

function SidebarLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  // Simple matching logic
  const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

  return (
    <Link
      href={item.href}
      className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 outline-none ${isActive
        ? "bg-white text-slate-900 shadow-sm font-medium"
        : "text-slate-300 hover:text-white hover:bg-white/5"
        }`}
    >
      <span className={`material-symbols-outlined text-[1.2rem] transition-colors ${isActive ? "text-slate-900" : "group-hover:text-white text-slate-300"
        }`}>
        {item.icon}
      </span>
      <span className="text-sm tracking-wide">
        {item.label}
      </span>
    </Link>
  );
}

export default function Sidebar({ role, userRole }: { role?: string, userRole?: any }) {
  const isAdmin = role === "ADMIN";
  const { signOut } = useClerk();
  const { user } = useUser();
  const router = useRouter();

  return (
    <aside className="hidden lg:flex w-72 flex-col border-r border-[#1e293b]/50 h-screen sticky top-0 font-sans text-slate-400 shadow-xl z-50 transition-colors duration-200" style={{ backgroundColor: '#0d1419' }}>

      {/* Header / Logo */}
      <div className="h-14 flex items-center px-6 shrink-0 border-b border-white/[0.05] gap-3 group w-full">
        <div className="relative shrink-0">
          <img
            alt="Logo"
            className="rounded-full size-9 object-cover ring-2 ring-white/10 ring-white/50 transition-all"
            src="/images/SS-Logo-2.png"
          />
        </div>
        <div className="flex flex-col justify-center">
          <h1 className="text-white text-base font-semibold tracking-tight leading-none group-hover:text-gray-200 transition-colors">Strøen Søns</h1>
          <span className="text-[10px] uppercase tracking-[0.1em] text-gray-400 font-bold mt-0.5">Etablert 2025</span>
        </div>
      </div>

      {/* Scrollable Nav Area */}
      <div className="flex-1 overflow-y-auto px-3 py-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">

        {/* Main Nav */}
        <div className="mb-6">
          <h3 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Meny</h3>
          <div className="flex flex-col gap-0.5">
            {MAIN_NAV.map((item) => (
              <SidebarLink key={item.href} item={item} />
            ))}
          </div>
        </div>

        {/* Account Nav */}
        <div className="mb-6">
          <h3 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Min Konto</h3>
          <div className="flex flex-col gap-0.5">
            {ACCOUNT_NAV.map((item) => (
              <SidebarLink key={item.href} item={item} />
            ))}
          </div>
        </div>

        {/* Admin Nav */}
        {(isAdmin || role === "MODERATOR" || (userRole?.allowedPaths && userRole.allowedPaths.length > 0)) && (
          <div className="mb-6">
            <h3 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Admin</h3>
            <div className="flex flex-col gap-0.5">
              {/* Admin Dashboard Link explicitly */}
              <SidebarLink item={{ href: "/admin", label: "Dashboard", icon: "admin_panel_settings" }} />

              {ADMIN_NAV
                .filter(item => {
                  if (item.href === "/admin") return false;
                  if (isAdmin) return true;
                  if (userRole?.allowedPaths && userRole.allowedPaths.length > 0) {
                    return userRole.allowedPaths.some((pattern: string) => {
                      try {
                        return new RegExp(`^${pattern}$`).test(item.href);
                      } catch (e) { return false; }
                    });
                  }
                  if (role === "MODERATOR") {
                    return ["/admin/events", "/admin/posts", "/admin/photos"].includes(item.href);
                  }
                  return false;
                })
                .map((item) => (
                  <SidebarLink key={item.href} item={item} />
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Section: Footer Links + Profile */}
      <div className="p-3 mt-auto border-t border-slate-800/50">
        <button
          onClick={() => signOut(() => router.push('/sign-in'))}
          className="flex w-full items-center gap-3 p-2.5 rounded-xl transition-colors hover:bg-white/5 group relative overflow-hidden text-left outline-none cursor-pointer"
        >
          {/* Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <span className="text-sm font-semibold text-white truncate group-hover:text-gray-200 transition-colors leading-tight">
              {user?.fullName || "Bruker"}
            </span>
            <span className="text-[10px] text-slate-400 truncate group-hover:text-slate-300 transition-colors">
              {user?.primaryEmailAddress?.emailAddress || ""}
            </span>
          </div>

          {/* Logout Icon */}
          <div className="size-8 flex items-center justify-center rounded-lg text-slate-400 group-hover:text-red-500 group-hover:bg-red-500/10 transition-all">
            <span className="material-symbols-outlined text-[1.2rem] scale-x-[-1]">logout</span>
          </div>
        </button>
      </div>
    </aside>
  );
}