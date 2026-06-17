"use client";

import { useEffect, useState } from "react";

interface Props {
  targetDate: Date | string;
}

type TimeLeft = { days: number; hours: number; minutes: number };

function calc(target: Date | string): TimeLeft | null {
  const diff = +new Date(target) - +new Date();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  return { days, hours, minutes };
}

function Unit({ value, label, pad }: { value: number; label: string; pad?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className="text-4xl sm:text-5xl font-normal leading-none tabular-nums text-[#d8d2c8]"
        style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
      >
        {pad ? String(value).padStart(2, "0") : value}
      </span>
      <span className="mt-2 text-[9px] font-bold uppercase tracking-[0.22em] text-gray-500">{label}</span>
    </div>
  );
}

function Dot() {
  return <span className="text-2xl text-gray-700 leading-none self-start mt-2">·</span>;
}

export function EventCountdownLarge({ targetDate }: Props) {
  // null until the first client tick — keeps SSR/CSR markup identical (no hydration mismatch)
  const [time, setTime] = useState<TimeLeft | null>(null);

  useEffect(() => {
    const tick = () => setTime(calc(targetDate));
    const first = setTimeout(tick, 0); // setState deferred to a callback (not synchronous in effect body)
    const timer = setInterval(tick, 30000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [targetDate]);

  // Reserve height so the hero doesn't jump when the countdown appears.
  if (!time) return <div className="h-[68px]" aria-hidden />;

  return (
    <div className="flex items-center gap-4 sm:gap-6">
      <Unit value={time.days} label="Dager" />
      <Dot />
      <Unit value={time.hours} label="Timer" pad />
      <Dot />
      <Unit value={time.minutes} label="Minutter" pad />
    </div>
  );
}
