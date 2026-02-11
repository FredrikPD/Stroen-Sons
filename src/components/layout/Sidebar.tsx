"use client";

import Link from "next/link";

import { useClerk } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { MAIN_NAV, ACCOUNT_NAV, ADMIN_NAV, type NavItem } from "./nav";

function SidebarLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = pathname === item.href;

  return (
    <Link
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${isActive
        ? "bg-white/15 text-white shadow-sm font-semibold"
        : "hover:bg-white/5 text-white/50 hover:text-white"
        }`}
      href={item.href}
    >
      <span className="material-symbols-outlined text-[1.125rem]">{item.icon}</span>
      <p className="text-sm font-medium">{item.label}</p>
    </Link>
  );
}

export default function Sidebar({ role, userRole }: { role?: string, userRole?: any }) {
  const isAdmin = role === "ADMIN";
  const { signOut } = useClerk();
  const router = useRouter();

  return (
    <aside className="hidden lg:flex w-72 flex-col border-r border-white/5 bg-[#050b14] flex-shrink-0 text-white/50">
      {/* Top: logo/title */}
      <div className="p-2">
        <div className="flex items-center gap-3">
          <img
            alt="Strøen Søns Logo"
            className="rounded-full size-10 object-cover border border-white"
            src="/images/SS-Logo-2.png"
          />
          <div className="flex flex-col">
            <h1 className="text-white text-base font-bold leading-tight">Strøen Søns</h1>
            <p className="text-white/60 text-[10px] uppercase tracking-wider">Etablert 2025</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h3 className="px-3 text-[10px] font-bold text-white/60 uppercase tracking-widest">Hovedmeny</h3>
          <nav className="flex flex-col gap-1">
            {MAIN_NAV.map((item) => (
              <SidebarLink key={item.href} item={item} />
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="px-3 text-[10px] font-bold text-white/60 uppercase tracking-widest">Min Konto</h3>
          <nav className="flex flex-col gap-1">
            {ACCOUNT_NAV.map((item) => (
              <SidebarLink key={item.href} item={item} />
            ))}
          </nav>
        </div>

        {(isAdmin || role === "MODERATOR" || (userRole?.allowedPaths && userRole.allowedPaths.length > 0)) && (
          <div className="flex flex-col gap-2">
            <h3 className="px-3 text-[10px] font-bold text-white/60 uppercase tracking-widest">Admin</h3>
            <nav className="flex flex-col gap-1">
              {ADMIN_NAV
                .filter(item => {
                  if (isAdmin) return true;

                  // Check dynamic permissions
                  if (userRole?.allowedPaths && userRole.allowedPaths.length > 0) {
                    // Special case for the main Admin Dashboard link
                    if (item.href === "/admin") {
                      // Show if user has access to ANY admin path (starts with /admin)
                      return userRole.allowedPaths.some((pattern: string) => pattern.startsWith("/admin") || pattern === "*" || pattern === "/admin");
                    }

                    return userRole.allowedPaths.some((pattern: string) => {
                      try {
                        return new RegExp(`^${pattern}$`).test(item.href);
                      } catch (e) { return false; }
                    });
                  }

                  // Fallback for Moderator (legacy)
                  if (role === "MODERATOR") {
                    return ["/admin", "/admin/events", "/admin/posts", "/admin/photos"].includes(item.href);
                  }
                  return false;
                })
                .map((item) => (
                  <SidebarLink key={item.href} item={item} />
                ))}
            </nav>
          </div>
        )}


      </div>

      {/* Logout */}
      <div className="p-2 border-t border-white/5 mt-auto">
        <button
          onClick={() => signOut(() => router.push('/sign-in'))}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[1.125rem] scale-x-[-1]">logout</span>
          <p className="text-sm font-medium">Logg ut</p>
        </button>
      </div>
    </aside>
  );
}