"use client";
import { useEffect, useState } from "react";

export type DashboardData = {
  member: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: "MEMBER" | "ADMIN";
    joinedAt: string;
    balance: string | number;
  };// Decimal comes as string or number often, unsafe to assume just number from JSON if not serialized carefully, but usually string or number. API route returns Decimal which JSON.stringifies to string usually or number. Let's say string | number.
  period: string;
  nextEvent: null | {
    id: string;
    title: string;
    description?: string | null;
    plan?: string | null;
    location?: string | null;
    startAt: string; // JSON
    coverImage?: string | null;
    imageUrl?: string | null;
  };
  paymentStatus: "PAID" | "UNPAID";
  posts: Array<{
    id: string;
    title: string;
    content: string;
    createdAt: string;
    author: { firstName: string | null; lastName: string | null };
  }>;
};

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error(`Dashboard API failed: ${res.status}`);
      setData(await res.json());
      setLoading(false);
    })().catch((e) => {
      console.error(e);
      setLoading(false);
    });
  }, []);

  return { data, loading };
}