import React, { ReactNode } from "react";

type ActionInfoVariant = "info" | "warning" | "danger";

const VARIANT_STYLES: Record<
    ActionInfoVariant,
    { container: string; icon: string; title: string; body: string; marker: string; defaultIcon: string }
> = {
    info: {
        container: "bg-blue-50 border-blue-100",
        icon: "text-blue-500",
        title: "text-blue-900",
        body: "text-blue-800/90",
        marker: "bg-blue-400",
        defaultIcon: "info",
    },
    warning: {
        container: "bg-amber-50 border-amber-100",
        icon: "text-amber-500",
        title: "text-amber-900",
        body: "text-amber-800/90",
        marker: "bg-amber-400",
        defaultIcon: "warning",
    },
    danger: {
        container: "bg-red-50 border-red-100",
        icon: "text-red-500",
        title: "text-red-900",
        body: "text-red-800/90",
        marker: "bg-red-400",
        defaultIcon: "warning",
    },
};

interface ActionInfoProps {
    /** Visual severity. danger = irreversible/money-wiping, warning = mass-notify/affects-all, info = benign/scoped. */
    variant?: ActionInfoVariant;
    /** Material Symbols icon name. Defaults per variant. */
    icon?: string;
    /** Optional bold heading, e.g. "Hva skjer når du sletter?". */
    title?: string;
    /** Main explanatory text. */
    children?: ReactNode;
    /** Optional bullet list of consequences. */
    items?: ReactNode[];
    /** Compact one-line helper (for use directly under a toggle/dropdown). */
    compact?: boolean;
    className?: string;
}

/**
 * Reusable info banner that tells the user what an action actually does
 * (notifications sent, irreversibility, money/balance movement, scope, etc.).
 *
 * Banner mode: place at the top of a form/action page or section.
 * Compact mode: place as a short helper line directly under a control.
 */
export function ActionInfo({
    variant = "info",
    icon,
    title,
    children,
    items,
    compact = false,
    className = "",
}: ActionInfoProps) {
    const s = VARIANT_STYLES[variant];
    const iconName = icon ?? s.defaultIcon;

    if (compact) {
        return (
            <p className={`mt-2 flex items-start gap-1.5 text-xs ${s.body} ${className}`}>
                <span className={`material-symbols-outlined text-sm leading-none mt-px ${s.icon}`}>{iconName}</span>
                <span className="leading-relaxed">{children}</span>
            </p>
        );
    }

    return (
        <div className={`flex gap-3 rounded-xl border p-4 ${s.container} ${className}`}>
            <span className={`material-symbols-outlined text-xl shrink-0 ${s.icon}`}>{iconName}</span>
            <div className={`text-sm leading-relaxed ${s.body} space-y-1.5`}>
                {title && <p className={`font-bold ${s.title}`}>{title}</p>}
                {children && <div className="space-y-1.5">{children}</div>}
                {items && items.length > 0 && (
                    <ul className="space-y-1.5">
                        {items.map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${s.marker}`} />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
