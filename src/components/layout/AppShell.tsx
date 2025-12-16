"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";
import Footer from "./Footer";
import { useDashboard } from "@/hooks/useDashboard";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data, loading } = useDashboard();
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);

  // Scroll to top when pathname changes
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [pathname]);

  return (
    <div className="flex h-screen w-full bg-background-main text-text-main overflow-hidden">
      <Sidebar role={data?.member.role} />

      {/* MobileMenu removed per user request */}
      {/* <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} /> */}

      <main
        ref={mainRef}
        className="flex-1 flex flex-col h-full overflow-y-auto relative bg-background-main"
      >
        <TopHeader
          loading={loading}
          userName={[data?.member.firstName, data?.member.lastName].filter(Boolean).join(" ") || null}
          avatarUrl={null}
          onMenuClick={() => { }} // Disabled menu click
        />

        <div className="flex-1 px-4 py-4 md:px-8 md:pt-6 md:pb-8 lg:px-12 lg:pt-8 lg:pb-12 max-w-7xl mx-auto w-full">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  );
}