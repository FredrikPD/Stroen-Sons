"use client";

import { useEffect } from "react";
import { Crumb, useBreadcrumbs } from "./BreadcrumbProvider";

export default function SetBreadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  const { setCrumbs } = useBreadcrumbs();

  useEffect(() => {
    setCrumbs(crumbs);
  }, [setCrumbs, crumbs]);

  return null;
}