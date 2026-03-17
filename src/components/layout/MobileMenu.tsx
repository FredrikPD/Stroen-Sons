"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { MAIN_NAV, ACCOUNT_NAV, ADMIN_NAV, type NavItem } from "./nav";

interface MobileMenuProps {
    open: boolean;
    onClose: () => void;
    role?: string;
    userRole?: any;
    userName?: string | null;
    avatarUrl?: string | null;
}

function MobileLink({ item, onClick }: { item: NavItem; onClick: () => void }) {
    const pathname = usePathname();
    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

    return (
        <Link
            href={item.href}
            onClick={onClick}
            className={`group relative flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 outline-none ${
                isActive
                    ? "text-white"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
            }`}
            style={isActive ? { background: "rgba(255,255,255,0.07)" } : undefined}
        >
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
            <span className="text-sm tracking-wide font-medium">{item.label}</span>
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

export default function MobileMenu({ open, onClose, role, userRole, userName, avatarUrl }: MobileMenuProps) {
    const router = useRouter();
    const { signOut } = useClerk();
    const { user } = useUser();

    const isAdmin = role === "ADMIN";
    const resolvedAvatarUrl = user?.imageUrl ?? avatarUrl;
    const resolvedName = user?.fullName ?? userName ?? "Bruker";

    const showAdmin =
        isAdmin ||
        role === "MODERATOR" ||
        (userRole?.allowedPaths && userRole.allowedPaths.length > 0);

    return (
        <div className="relative z-50 lg:hidden" aria-hidden={!open}>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
                    open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
                onClick={onClose}
            />

            <div className="fixed inset-0 flex pointer-events-none">
                {/* Panel */}
                <div
                    className={`pointer-events-auto relative flex w-[75vw] max-w-xs flex-col shadow-2xl transition-transform duration-300 transform ${
                        open ? "translate-x-0" : "-translate-x-full"
                    }`}
                    style={{
                        background: "linear-gradient(180deg, #131313 0%, #0f0f0f 100%)",
                        borderRight: "1px solid rgba(255,255,255,0.05)",
                    }}
                >
                    {/* Logo */}
                    <div
                        className="h-14 flex items-center justify-between px-5 shrink-0"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                    >
                        <div className="flex items-center gap-3.5">
                            <img
                                alt="Logo"
                                className="size-8 rounded-full object-cover shrink-0"
                                style={{
                                    boxShadow:
                                        "0 0 0 1px rgba(255,255,255,0.1), 0 0 0 3px rgba(255,255,255,0.04)",
                                }}
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

                        <button
                            onClick={onClose}
                            className="size-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[1.1rem]">close</span>
                        </button>
                    </div>

                    {/* Nav */}
                    <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <div>
                            <SectionHeader label="Meny" />
                            <div className="flex flex-col gap-0.5">
                                {MAIN_NAV.map((item) => (
                                    <MobileLink key={item.href} item={item} onClick={onClose} />
                                ))}
                            </div>
                        </div>

                        <div>
                            <SectionHeader label="Min Konto" />
                            <div className="flex flex-col gap-0.5">
                                {ACCOUNT_NAV.map((item) => (
                                    <MobileLink key={item.href} item={item} onClick={onClose} />
                                ))}
                            </div>
                        </div>

                        {showAdmin && (
                            <div>
                                <SectionHeader label="Admin" />
                                <div className="flex flex-col gap-0.5">
                                    <MobileLink
                                        item={{ href: "/admin/dashboard", label: "Dashboard", icon: "admin_panel_settings" }}
                                        onClick={onClose}
                                    />
                                    {ADMIN_NAV.filter((item) => {
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
                                    }).map((item) => (
                                        <MobileLink key={item.href} item={item} onClick={onClose} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User / Logout */}
                    <div
                        className="p-3 shrink-0"
                        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                    >
                        <button
                            onClick={() => signOut(() => router.push("/sign-in"))}
                            className="flex w-full items-center gap-3 p-2.5 rounded-xl transition-all group outline-none cursor-pointer hover:bg-white/5"
                        >
                            <div
                                className="size-8 rounded-full shrink-0 overflow-hidden flex items-center justify-center"
                                style={{
                                    background: "rgba(255,255,255,0.08)",
                                    boxShadow: "0 0 0 1px rgba(255,255,255,0.08)",
                                }}
                            >
                                {resolvedAvatarUrl ? (
                                    <img src={resolvedAvatarUrl} alt="" className="size-8 object-cover" />
                                ) : (
                                    <span className="text-[11px] font-bold text-gray-400 uppercase">
                                        {resolvedName
                                            .split(" ")
                                            .filter(Boolean)
                                            .map((w: string) => w[0])
                                            .slice(0, 2)
                                            .join("")}
                                    </span>
                                )}
                            </div>

                            <div className="flex-1 min-w-0 text-left">
                                <span className="block text-[13px] font-medium text-gray-300 group-hover:text-white transition-colors leading-tight truncate">
                                    {resolvedName}
                                </span>
                                <span className="block text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors truncate">
                                    {user?.primaryEmailAddress?.emailAddress || ""}
                                </span>
                            </div>

                            <div className="size-7 flex items-center justify-center rounded-lg text-gray-500 group-hover:text-red-400 group-hover:bg-red-500/10 transition-all shrink-0">
                                <span className="material-symbols-outlined text-[1.1rem] scale-x-[-1]">logout</span>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="flex-1" onClick={onClose} />
            </div>
        </div>
    );
}
