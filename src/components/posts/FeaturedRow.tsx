"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FeaturedPost, type FeaturedPostData } from "./FeaturedPost";

// useLayoutEffect on the client, useEffect during SSR (avoids the React warning).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Top section of the posts page: the featured post (left, 2 cols) next to the
 * Festet/Arkiv sidebar (right, 1 col). On lg+ the left card height is locked to
 * the sidebar's measured height so both columns are always exactly equal — the
 * featured preview then fills (and clips) to fit. On mobile each stacks naturally.
 */
export function FeaturedRow({
    featured,
    categoryColor,
    sidebar,
}: {
    featured: FeaturedPostData;
    categoryColor?: string;
    sidebar: React.ReactNode;
}) {
    const rightRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<number | undefined>(undefined);

    useIsoLayoutEffect(() => {
        const right = rightRef.current;
        if (!right) return;
        const mql = window.matchMedia("(min-width: 1024px)");
        const measure = () => {
            setHeight(mql.matches ? right.offsetHeight : undefined);
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(right);
        mql.addEventListener("change", measure);
        return () => {
            ro.disconnect();
            mql.removeEventListener("change", measure);
        };
    }, []);

    const fill = height !== undefined;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10 items-start">
            <div className="lg:col-span-2 min-w-0" style={fill ? { height } : undefined}>
                <FeaturedPost post={featured} categoryColor={categoryColor} fill={fill} />
            </div>
            <div ref={rightRef} className="min-w-0">
                {sidebar}
            </div>
        </div>
    );
}
