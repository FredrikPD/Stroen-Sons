"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export type Crumb = { label: string; href?: string };

type Ctx = {
  crumbs: Crumb[];
  setCrumbs: (c: Crumb[]) => void;
};

const BreadcrumbCtx = createContext<Ctx | null>(null);

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  const value = useMemo(() => ({ crumbs, setCrumbs }), [crumbs]);
  return <BreadcrumbCtx.Provider value={value}>{children}</BreadcrumbCtx.Provider>;
}

export function useBreadcrumbs() {
  const ctx = useContext(BreadcrumbCtx);
  if (!ctx) throw new Error("useBreadcrumbs must be used inside BreadcrumbProvider");
  return ctx;
}