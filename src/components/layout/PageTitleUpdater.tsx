"use client";

import { useEffect } from "react";
import { useHeader } from "./HeaderContext";

export default function PageTitleUpdater({
    title,
    backHref,
    backLabel
}: {
    title: string;
    backHref?: string;
    backLabel?: string;
}) {
    const { setTitle, setBackHref, setBackLabel } = useHeader();

    useEffect(() => {
        setTitle(title);
        if (backHref) setBackHref(backHref);
        if (backLabel) setBackLabel(backLabel);

        return () => {
            setTitle(null);
            if (backHref) setBackHref(null);
            if (backLabel) setBackLabel(null);
        };
    }, [title, backHref, backLabel, setTitle, setBackHref, setBackLabel]);

    return null;
}
