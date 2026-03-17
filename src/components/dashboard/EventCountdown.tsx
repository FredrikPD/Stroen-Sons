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
        <div className="bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 flex flex-col items-center shadow-sm">
            <span
                className="text-2xl font-normal leading-none text-gray-900"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
            >
                {daysLeft}
            </span>
            <span className="text-[9px] font-bold tracking-widest text-gray-400 mt-0.5">DAGER</span>
        </div>
    );
}
