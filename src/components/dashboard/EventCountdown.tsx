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
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 text-center min-w-[50px]">
                <span className="block text-2xl font-bold leading-none">{daysLeft}</span>
                <span className="text-[9px] uppercase text-white/70 font-bold tracking-wider">Dager</span>
            </div>
        </div>
    );
}
