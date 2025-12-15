"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";
import { useDashboard } from "@/hooks/useDashboard";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data, loading } = useDashboard();
  // const [menuOpen, setMenuOpen] = useState(false); // Removed MobileMenu logic

  return (
    <div className="flex h-screen w-full bg-background-main text-text-main overflow-hidden">
      <Sidebar role={data?.member.role} />

      {/* MobileMenu removed per user request */}
      {/* <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} /> */}

      <main className="flex-1 flex flex-col h-full overflow-y-auto relative bg-background-main">
        <TopHeader
          loading={loading}
          userName={[data?.member.firstName, data?.member.lastName].filter(Boolean).join(" ") || null}
          avatarUrl={null}
          onMenuClick={() => { }} // Disabled menu click
        />

        <div className="flex-1 p-4 md:p-8 lg:p-12 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}