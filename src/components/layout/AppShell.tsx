"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import TopNav from "./TopNav";
import Footer from "./Footer";
import MobileMenu from "./MobileMenu";
import { getCurrentMember } from "@/server/actions/finance";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fetchMember = async () => {
      const m = await getCurrentMember();
      setMember(m);
      setLoading(false);
    };
    fetchMember();
  }, []);

  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);

  // Scroll to top when pathname changes
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    setMenuOpen(false); // Close mobile menu on navigate
  }, [pathname]);

  const userName = [member?.firstName, member?.lastName].filter(Boolean).join(" ") || null;

  // The dashboard owns its own full-bleed layout (hero + centered body);
  // every other page gets a centered, padded container.
  const isDashboard = pathname === "/dashboard" || pathname === "/";

  // These member surfaces (list + detail) sit on the same warm cream field as
  // the dashboard body, so white cards pop the same way.
  const CREAM_SURFACES = ["/posts", "/events", "/gallery", "/scoreboard", "/members", "/about"];
  const isCreamSurface = CREAM_SURFACES.some(
    (base) => pathname === base || pathname.startsWith(base + "/")
  );

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-full bg-background-main text-text-main overflow-hidden">
      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        role={member?.role}
        userRole={member?.userRole}
        userName={userName}
        avatarUrl={member?.avatarUrl ?? null}
      />

      <TopNav
        loading={loading}
        userName={userName}
        avatarUrl={member?.avatarUrl ?? null}
        role={member?.role}
        userRole={member?.userRole}
        onMenuClick={() => setMenuOpen(true)}
      />

      <main
        ref={mainRef}
        className={`flex-1 min-w-0 flex flex-col overflow-y-auto overflow-x-hidden relative ${
          isCreamSurface ? "bg-cream" : "bg-background-main"
        }`}
      >
        {isDashboard ? (
          <div className="flex-1 w-full min-w-0">{children}</div>
        ) : (
          <div className="flex-1 mx-auto w-full max-w-screen-xl px-4 py-4 sm:px-5 md:pt-6 md:pb-8 lg:px-6 lg:pb-12 min-w-0">
            {children}
          </div>
        )}
        <Footer />
      </main>
    </div>
  );
}
