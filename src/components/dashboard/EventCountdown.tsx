"use client";

import { useEffect, useState } from "react";

interface EventCountdownProps {
    targetDate: Date | string;
}

export function EventCountdown({ targetDate }: EventCountdownProps) {
    const calculateTimeLeft = () => {
        const difference = +new Date(targetDate) - +new Date();

        if (difference > 0) {
            // Calculate days, rounding up so 0.5 days shows as 1 day remaining
            return Math.ceil(difference / (1000 * 60 * 60 * 24));
        }

        return 0;
    };

    const [daysLeft, setDaysLeft] = useState<number | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setDaysLeft(calculateTimeLeft());

        // Update every minute instead of second since we only show days
        const timer = setInterval(() => {
            setDaysLeft(calculateTimeLeft());
        }, 60000);

        return () => clearInterval(timer);
    }, [targetDate]);

    // Avoid hydration mismatch by not rendering until mounted
    if (!mounted || daysLeft === null) return null;

    return (
        <div className="flex gap-2">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl px-3 py-2.5 text-center min-w-[72px] shadow-sm">
                <span className="block text-2xl font-bold leading-none">{daysLeft}</span>
                <span className="text-[10px] uppercase text-white/80 font-bold tracking-[0.14em]">Dager</span>
            </div>
        </div>
    );
}
