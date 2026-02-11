"use client";

import { useEffect } from "react";
import { useHeader } from "@/components/layout/HeaderContext";

export function SetHeader({ backHref, backLabel }: { backHref?: string; backLabel?: string }) {
    const { setBackHref, setBackLabel } = useHeader();

    useEffect(() => {
        if (backHref) setBackHref(backHref);
        if (backLabel) setBackLabel(backLabel);

        return () => {
            setBackHref(null);
            setBackLabel(null);
        };
    }, [backHref, backLabel, setBackHref, setBackLabel]);

    return null;
}
