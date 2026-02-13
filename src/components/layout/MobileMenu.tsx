"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { MAIN_NAV, ACCOUNT_NAV, ADMIN_NAV, type NavItem } from "./nav";
import { Avatar } from "@/components/Avatar";

interface MobileMenuProps {
    open: boolean;
    onClose: () => void;
    role?: string;
    userRole?: any; // Consider typing this properly with Prisma types if available in client
    userName?: string | null;
    avatarUrl?: string | null;
}

// ... MobileLink component ...

export default function MobileMenu({ open, onClose, role, userRole, userName, avatarUrl }: MobileMenuProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { signOut } = useClerk();
    const { user } = useUser();
    const [isAdmin, setIsAdmin] = useState(false);
    const resolvedAvatarUrl = user?.imageUrl ?? avatarUrl;

    useEffect(() => {
        if (role === "ADMIN") {
            setIsAdmin(true);
        } else {
            setIsAdmin(false);
        }
    }, [role]);

    const MobileLink = ({ item, onClick }: { item: NavItem; onClick: () => void }) => {
        const isActive = pathname === item.href;
        return (
            <Link
                href={item.href}
                onClick={onClick}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
            >
                <span className="material-symbols-outlined text-[1.125rem]">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
            </Link>
        );
    };

    return (
        <div className="relative z-50 lg:hidden" aria-hidden={!open}>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-gray-900/80 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                onClick={onClose}
            />

            <div className="fixed inset-0 flex pointer-events-none">
                {/* Panel */}
                <div
                    className={`pointer-events-auto relative flex w-[75vw] max-w-lg flex-col bg-white shadow-2xl transition-transform duration-300 transform ${open ? "translate-x-0" : "-translate-x-full"}`}
                >
                    {/* Header */}
                    <div className="flex shrink-0 items-center justify-between p-2">
                        <div className="flex items-center gap-3">
                            <img
                                alt="Strøen Søns Logo"
                                className="rounded-full size-10 object-cover border border-gray-200"
                                src="/images/SS-Logo-2.png"
                            />
                            <div className="flex flex-col">
                                <h1 className="text-gray-900 text-sm font-bold leading-tight">Strøen Søns</h1>
                                <p className="text-gray-500 text-[10px] uppercase tracking-wider">ETABLERT 2025</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {/* Nav */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-8">
                        <div className="flex flex-col gap-2">
                            <h3 className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Hovedmeny</h3>
                            <div className="flex flex-col gap-1">
                                {MAIN_NAV.map((item) => (
                                    <MobileLink key={item.href} item={item} onClick={onClose} />
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <h3 className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Min Konto</h3>
                            <div className="flex flex-col gap-1">
                                {ACCOUNT_NAV.map((item) => (
                                    <MobileLink key={item.href} item={item} onClick={onClose} />
                                ))}
                            </div>
                        </div>

                        {(isAdmin || role === "MODERATOR" || (userRole?.allowedPaths && userRole.allowedPaths.length > 0)) && (
                            <div className="flex flex-col gap-2">
                                <h3 className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Admin</h3>
                                <div className="flex flex-col gap-1">
                                    {ADMIN_NAV
                                        .filter(item => {
                                            if (isAdmin) return true;

                                            // Check dynamic permissions
                                            if (userRole?.allowedPaths && userRole.allowedPaths.length > 0) {
                                                // Special case for main Admin link
                                                if (item.href === "/admin/dashboard") {
                                                    return userRole.allowedPaths.some((pattern: string) => pattern.startsWith("/admin") || pattern === "*" || pattern === "/admin");
                                                }

                                                return userRole.allowedPaths.some((pattern: string) => {
                                                    try {
                                                        return new RegExp(`^${pattern}$`).test(item.href);
                                                    } catch (e) { return false; }
                                                });
                                            }

                                            // Fallback for Moderators
                                            if (role === "MODERATOR") {
                                                return ["/admin/dashboard", "/admin/events", "/admin/posts", "/admin/photos"].includes(item.href);
                                            }
                                            return false;
                                        })
                                        .map((item) => (
                                            <MobileLink key={item.href} item={item} onClick={onClose} />
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer / User Info */}
                    <div className="p-2 border-t border-gray-100 mt-auto">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3 px-3 py-2">
                                <Avatar
                                    src={resolvedAvatarUrl}
                                    initials={userName ? userName.substring(0, 2).toUpperCase() : "??"}
                                    alt={userName || "Bruker"}
                                    className="h-8 w-8 text-xs font-bold shadow-sm bg-[#1A1A1A]"
                                    size="sm"
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-gray-900">{userName || "Bruker"}</span>
                                    <span className="text-xs text-gray-500 capitalize">{role ? role.toLowerCase() : "Medlem"}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => signOut(() => router.push('/sign-in'))}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 text-gray-600 hover:text-red-700 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[1.125rem] scale-x-[-1]">logout</span>
                                <span className="text-sm font-medium">Logg ut</span>
                            </button>
                        </div>
                    </div>
                </div>
                {/* Close button area (click outside) */}
                <div className="flex-1" onClick={onClose} />
            </div>
        </div>
    );
}
