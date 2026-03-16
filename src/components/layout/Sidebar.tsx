"use client";

import Link from "next/link";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { MAIN_NAV, ACCOUNT_NAV, ADMIN_NAV, type NavItem } from "./nav";

function SidebarLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

  return (
    <Link
      href={item.href}
      className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 outline-none ${
        isActive
          ? "text-white"
          : "text-gray-300 hover:text-white hover:bg-white/5"
      }`}
      style={isActive ? { background: "rgba(255,255,255,0.07)" } : undefined}
    >
      {/* Active left accent */}
      {isActive && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-6 rounded-full"
          style={{ background: "rgba(255,255,255,0.5)" }}
        />
      )}

      <span
        className={`material-symbols-outlined text-[1.1rem] transition-colors shrink-0 ${
          isActive ? "text-white" : "text-gray-400 group-hover:text-white"
        }`}
      >
        {item.icon}
      </span>

      <span className="text-[13px] tracking-wide font-medium">
        {item.label}
      </span>
    </Link>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-3 mb-2">
      <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-gray-400 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
    </div>
  );
}

export default function Sidebar({ role, userRole }: { role?: string; userRole?: any }) {
  const isAdmin = role === "ADMIN";
  const { signOut } = useClerk();
  const { user } = useUser();
  const router = useRouter();

  return (
    <aside
      className="hidden lg:flex w-68 flex-col h-full z-50"
      style={{
        background: "linear-gradient(180deg, #131313 0%, #0f0f0f 100%)",
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* ── Logo ── */}
      <div
        className="h-14 flex items-center px-5 shrink-0 gap-3.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <img
          alt="Logo"
          className="size-8 rounded-full object-cover shrink-0"
          style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.1), 0 0 0 3px rgba(255,255,255,0.04)" }}
          src="/images/SS-Logo-2.png"
        />
        <div>
          <h1
            className="text-white text-[15px] font-normal leading-none"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            Strøen Søns
          </h1>
          <span className="text-[9px] uppercase tracking-[0.2em] text-gray-500 font-bold mt-1 block">
            Etablert 2025
          </span>
        </div>
      </div>

      {/* ── Nav Area ── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

        {/* Main Nav */}
        <div>
          <SectionHeader label="Meny" />
          <div className="flex flex-col gap-0.5">
            {MAIN_NAV.map((item) => (
              <SidebarLink key={item.href} item={item} />
            ))}
          </div>
        </div>

        {/* Account Nav */}
        <div>
          <SectionHeader label="Min Konto" />
          <div className="flex flex-col gap-0.5">
            {ACCOUNT_NAV.map((item) => (
              <SidebarLink key={item.href} item={item} />
            ))}
          </div>
        </div>

        {/* Admin Nav */}
        {(isAdmin || role === "MODERATOR" || (userRole?.allowedPaths && userRole.allowedPaths.length > 0)) && (
          <div>
            <SectionHeader label="Admin" />
            <div className="flex flex-col gap-0.5">
              <SidebarLink item={{ href: "/admin/dashboard", label: "Dashboard", icon: "admin_panel_settings" }} />
              {ADMIN_NAV
                .filter(item => {
                  if (item.href === "/admin/dashboard") return false;
                  if (isAdmin) return true;
                  if (userRole?.allowedPaths && userRole.allowedPaths.length > 0) {
                    return userRole.allowedPaths.some((pattern: string) => {
                      try {
                        return new RegExp(`^${pattern}$`).test(item.href);
                      } catch { return false; }
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

      {/* ── User / Logout ── */}
      <div
        className="p-3 shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <button
          onClick={() => signOut(() => router.push("/sign-in"))}
          className="flex w-full items-center gap-3 p-2.5 rounded-xl transition-all group outline-none cursor-pointer hover:bg-white/5"
        >
          {/* Avatar */}
          <div
            className="size-8 rounded-full shrink-0 overflow-hidden flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.08)", boxShadow: "0 0 0 1px rgba(255,255,255,0.08)" }}
          >
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt="" className="size-8 object-cover" />
            ) : (
              <span className="text-[11px] font-bold text-gray-400 uppercase">
                {user?.firstName?.[0] ?? "?"}{user?.lastName?.[0] ?? ""}
              </span>
            )}
          </div>

          {/* Name / email */}
          <div className="flex-1 min-w-0 text-left">
            <span className="block text-[13px] font-medium text-gray-300 group-hover:text-white transition-colors leading-tight truncate">
              {user?.fullName || "Bruker"}
            </span>
            <span className="block text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors truncate">
              {user?.primaryEmailAddress?.emailAddress || ""}
            </span>
          </div>

          {/* Logout icon */}
          <div className="size-7 flex items-center justify-center rounded-lg text-gray-500 group-hover:text-red-400 group-hover:bg-red-500/10 transition-all shrink-0">
            <span className="material-symbols-outlined text-[1.1rem] scale-x-[-1]">logout</span>
          </div>
        </button>
      </div>
    </aside>
  );
}
