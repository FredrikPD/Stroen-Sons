"use client";
import { useEffect, useState } from "react";
import type { AdminDashboardData } from "@/lib/admin-dashboard";

export function useAdminDashboard(initialData?: AdminDashboardData | null) {
    const [data, setData] = useState<AdminDashboardData | null>(initialData ?? null);
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (initialData) return;

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
    }, [initialData]);

    return { data, loading, error };
}
