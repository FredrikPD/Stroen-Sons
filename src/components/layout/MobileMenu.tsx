"use client";

import Link from "next/link";

export default function MobileMenu({open, onClose,}: {open: boolean; onClose: () => void;}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* backdrop */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      {/* drawer */}
      <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-background-sidebar border-r border-border-color p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold">Meny</div>
          <button type="button" onClick={onClose} aria-label="Close menu">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex flex-col gap-2">
          <Link onClick={onClose} href="/dashboard" className="px-3 py-2 rounded hover:bg-white">
            Dashboard
          </Link>
          <Link onClick={onClose} href="/events" className="px-3 py-2 rounded hover:bg-white">
            Arrangementer
          </Link>
        </nav>
      </div>
    </div>
  );
}