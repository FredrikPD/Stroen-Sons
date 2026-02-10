"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";
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

  return (
    <div className="flex h-screen w-full bg-background-main text-text-main overflow-hidden">
      <Sidebar role={member?.role} userRole={member?.userRole} />

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        role={member?.role}
        userRole={member?.userRole}
        userName={[member?.firstName, member?.lastName].filter(Boolean).join(" ") || null}
      />

      <main
        ref={mainRef}
        className="flex-1 flex flex-col h-full overflow-y-auto relative bg-background-main"
      >
        <TopHeader
          loading={loading}
          userName={[member?.firstName, member?.lastName].filter(Boolean).join(" ") || null}
          avatarUrl={null}
          onMenuClick={() => setMenuOpen(true)}
        />

        <div className={pathname === '/about'
          ? "flex-1 w-full"
          : "flex-1 px-4 py-4 md:px-8 md:pt-6 md:pb-8 lg:px-12 lg:pt-8 lg:pb-12 w-full"
        }>
          {children}
        </div>
        <Footer />
      </main>
    </div>
  );
}