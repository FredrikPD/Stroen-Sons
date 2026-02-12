"use client";

import { useEffect, useState } from "react";

export function AppLaunchOverlay() {
    const [visible, setVisible] = useState(false);
    const [fadingOut, setFadingOut] = useState(false);

    useEffect(() => {
        const isStandalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

        if (!isStandalone) return;

        setVisible(true);

        const fadeTimer = window.setTimeout(() => setFadingOut(true), 900);
        const hideTimer = window.setTimeout(() => setVisible(false), 1300);

        return () => {
            window.clearTimeout(fadeTimer);
            window.clearTimeout(hideTimer);
        };
    }, []);

    if (!visible) return null;

    return (
        <div
            aria-hidden
            className={`fixed inset-0 z-[200] flex items-center justify-center bg-[#4F46E5] transition-opacity duration-300 ${fadingOut ? "opacity-0" : "opacity-100"}`}
        >
            <div className="flex flex-col items-center gap-4 text-center text-white">
                <img
                    src="/images/SS-Logo-2.png"
                    alt=""
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-white/25"
                />
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <p className="text-xs font-semibold uppercase tracking-[0.12em]">Henter innhold...</p>
            </div>
        </div>
    );
}
