"use client";

import Link from "next/link";
import { useBreadcrumbs } from "./BreadcrumbProvider";

export default function BreadcrumbBar() {
  const { crumbs } = useBreadcrumbs();

  if (!crumbs.length) return null;

  return (
    <div className="px-4 md:px-8 lg:px-12 pt-6">
      <div className="text-sm flex items-center gap-2 text-text-secondary">
        {crumbs.map((c, i) => (
          <span key={`${c.label}-${i}`} className="flex items-center gap-2">
            {c.href ? (
              <Link className="hover:text-text-main transition-colors" href={c.href}>
                {c.label}
              </Link>
            ) : (
              <span className="text-text-main font-medium">{c.label}</span>
            )}
            {i < crumbs.length - 1 && <span className="text-text-secondary">/</span>}
          </span>
        ))}
      </div>
    </div>
  );
}