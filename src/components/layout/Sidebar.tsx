"use client";

import Link from "next/link";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function Sidebar({ role }: { role?: string }) {
  const isAdmin = role === "ADMIN";
  const { signOut } = useClerk();
  const router = useRouter();

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-white/5 bg-background-sidebar flex-shrink-0 text-white/50">
      {/* Top: logo/title */}
      <div className="p-6 pb-2">
        <div className="flex items-center gap-3">
          <img
            alt="Strøen Søns Logo"
            className="rounded-full size-10 object-cover border border-white/10"
            src="/SS-Logo-2.png"
          />
          <div className="flex flex-col">
            <h1 className="text-white text-base font-bold leading-tight">Strøen Søns</h1>
            <p className="text-white/60 text-[10px] uppercase tracking-wider">Etablert 2025</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h3 className="px-3 text-[10px] font-bold text-white/60 uppercase tracking-widest">Hovedmeny</h3>
          <nav className="flex flex-col gap-1">
            <Link className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#1A1A1A] text-white shadow-sm border border-white/5" href="/dashboard">
              <span className="material-symbols-outlined text-[1.125rem]">home</span>
              <p className="text-sm font-medium">Hjem</p>
            </Link>
            <Link className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-all" href="/posts">
              <span className="material-symbols-outlined text-[1.125rem]">news</span>
              <p className="text-sm font-medium">Innlegg</p>
            </Link>
            <Link className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-all" href="/events">
              <span className="material-symbols-outlined text-[1.125rem]">calendar_month</span>
              <p className="text-sm font-medium">Events</p>
            </Link>
            <Link className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-all" href="/gallery">
              <span className="material-symbols-outlined text-[1.125rem]">photo_library</span>
              <p className="text-sm font-medium">Bildearkiv</p>
            </Link>
            <Link className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-all" href="/members">
              <span className="material-symbols-outlined text-[1.125rem]">group</span>
              <p className="text-sm font-medium">Medlemmer</p>
            </Link>
            <Link className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-all" href="/about">
              <span className="material-symbols-outlined text-[1.125rem]">info</span>
              <p className="text-sm font-medium">Om</p>
            </Link>
          </nav>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="px-3 text-[10px] font-bold text-white/60 uppercase tracking-widest">Min Konto</h3>
          <nav className="flex flex-col gap-1">
            <Link className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-all" href="/">
              <span className="material-symbols-outlined text-[1.125rem]">account_balance_wallet</span>
              <p className="text-sm font-medium">Saldo</p>
            </Link>
            <Link className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-all" href="/">
              <span className="material-symbols-outlined text-[1.125rem]">settings</span>
              <p className="text-sm font-medium">Innstillinger</p>
            </Link>
          </nav>
        </div>

        {isAdmin && (
          <div className="flex flex-col gap-2">
            <h3 className="px-3 text-[10px] font-bold text-white/60 uppercase tracking-widest">Admin</h3>
            <nav className="flex flex-col gap-1">
              <Link className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-all" href="/admin">
                <span className="material-symbols-outlined text-[1.125rem]">admin_panel_settings</span>
                <p className="text-sm font-medium">Admin Dashboard</p>
              </Link>
            </nav>
          </div>
        )}
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-white/5 mt-auto">
        <button
          onClick={() => signOut({ redirectUrl: '/sign-in' })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-[1.125rem] scale-x-[-1]">logout</span>
          <p className="text-sm font-medium">Logg ut</p>
        </button>
      </div>
    </aside>
  );
}