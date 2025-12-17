"use client";
import { useEffect, useState } from "react";

export type AdminDashboardData = {
    firstName: string | null;
    memberCount: number;
    treasuryBalance: number;
    nextEvent: null | {
        id: string;
        title: string;
        startAt: string; // JSON
        coverImage?: string | null;
    };
};

export function useAdminDashboard() {
    const [data, setData] = useState<AdminDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
                if (!res.ok) {
                    if (res.status === 403) throw new Error("Forbidden");
                    throw new Error(`Admin Dashboard API failed: ${res.status}`);
                }
                setData(await res.json());
            } catch (e: any) {
                console.error(e);
                setError(e.message);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return { data, loading, error };
}
