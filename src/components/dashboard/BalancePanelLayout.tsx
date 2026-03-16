"use client";

import { useRef, useState, useEffect, ReactNode } from "react";

export function BalancePanelLayout({ left, right }: { left: ReactNode; right: ReactNode }) {
    const leftRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<number | undefined>(undefined);

    useEffect(() => {
        const el = leftRef.current;
        if (!el) return;
        const observer = new ResizeObserver(([entry]) => {
            setHeight(entry.contentRect.height);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div ref={leftRef}>{left}</div>
            <div
                className="lg:col-span-2 transition-opacity duration-150"
                style={height ? { height, opacity: 1 } : { height: 0, opacity: 0 }}
            >
                {right}
            </div>
        </div>
    );
}
