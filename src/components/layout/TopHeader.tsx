"use client";

export default function TopHeader({
  loading,
  userName,
  avatarUrl,
  breadcrumbs,
  onMenuClick,
}: {
  loading: boolean;
  userName: string | null;
  avatarUrl: string | null;
  breadcrumbs: { section: string; page: string };
  onMenuClick: () => void;
}) {
  return (
    <header className="sticky top-0 h-14 border-b border-surface-highlight bg-background-header backdrop-blur-sm flex items-center justify-between px-6 lg:px-10 shrink-0 z-20">
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
        <div className="hidden md:flex items-center gap-2 text-sm">
          <span className="text-text-secondary text-xs uppercase tracking-wide font-medium">Events</span>
          <span className="text-text-secondary/40 text-[10px] icon-[material-symbols--chevron-right]">/</span>
          <span className="text-text-secondary text-xs uppercase tracking-wide font-medium">2024</span>
          <span className="text-text-secondary/40 text-[10px] icon-[material-symbols--chevron-right]">/</span>
          <span className="text-text-main font-bold text-sm">Sommerfest</span>
        </div>
      </div>

      {/* Right (Profile) */}
      <div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-[#BFA181] hover:text-[#BFA181] text-text-main transition-all text-sm font-bold shadow-sm">
          <span className="material-symbols-outlined text-lg">account_circle</span>
          Min Profil
        </button>
      </div>
    </header>
  );
}