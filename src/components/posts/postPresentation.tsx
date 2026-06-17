import React from "react";

/* ── Shared presentational helpers for the Posts surface ──────────
   Mirrors the dashboard StripePlaceholder idiom and centralises the
   excerpt / reading-time logic used by the feed and the featured card. */

export const SERIF = "'Georgia', 'Times New Roman', serif";

/** Diagonal striped placeholder used when a post has no cover image.
    Same treatment as dashboard/page.tsx (warm cream stripes). */
export function StripePlaceholder({
  label,
  dark = false,
  className = "",
}: {
  label?: string;
  dark?: boolean;
  className?: string;
}) {
  const bg = dark
    ? "repeating-linear-gradient(135deg, #1b1a16 0 14px, #221f1a 14px 28px)"
    : "repeating-linear-gradient(135deg, #ece5d8 0 14px, #f3eee4 14px 28px)";
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ backgroundImage: bg }}>
      {label && (
        <span
          className={`text-[10px] uppercase tracking-[0.22em] ${dark ? "text-white/30" : "text-[#a89c86]"}`}
        >
          {label}
        </span>
      )}
    </div>
  );
}

/** Strip the most common markdown tokens so content can be shown as a
    plain-text excerpt. Intentionally lightweight — no full parser. */
export function stripMarkdown(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
    .replace(/`([^`]+)`/g, "$1") // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → text
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/^\s*>\s?/gm, "") // blockquotes
    .replace(/^\s*[-*+]\s+/gm, "") // list bullets
    .replace(/[*_~]+/g, "") // emphasis markers
    .replace(/\s+/g, " ")
    .trim();
}

/** ~160-char plain-text excerpt for the featured card and list rows. */
export function excerpt(content: string, max = 160): string {
  const text = stripMarkdown(content);
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

/** Reading time in whole minutes, floored at 1. */
export function readingTime(content: string): number {
  const words = stripMarkdown(content).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
