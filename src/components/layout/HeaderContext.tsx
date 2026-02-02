"use client";

import { createContext, useContext, useState } from "react";

interface HeaderContextType {
    title: string | null;
    setTitle: (title: string | null) => void;
    backHref: string | null;
    setBackHref: (href: string | null) => void;
    backLabel: string | null;
    setBackLabel: (label: string | null) => void;

}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export function HeaderProvider({ children }: { children: React.ReactNode }) {
    const [title, setTitle] = useState<string | null>(null);
    const [backHref, setBackHref] = useState<string | null>(null);
    const [backLabel, setBackLabel] = useState<string | null>(null);

    return (
        <HeaderContext.Provider value={{
            title, setTitle,
            backHref, setBackHref,
            backLabel, setBackLabel
        }}>
            {children}
        </HeaderContext.Provider>
    );
}

export function useHeader() {
    const context = useContext(HeaderContext);
    if (!context) {
        throw new Error("useHeader must be used within a HeaderProvider");
    }
    return context;
}
