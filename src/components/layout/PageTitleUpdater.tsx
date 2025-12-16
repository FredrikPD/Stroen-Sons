"use client";

import { useEffect } from "react";
import { useHeader } from "./HeaderContext";

export default function PageTitleUpdater({ title }: { title: string }) {
    const { setTitle } = useHeader();

    useEffect(() => {
        setTitle(title);
        return () => setTitle(null);
    }, [title, setTitle]);

    return null;
}
