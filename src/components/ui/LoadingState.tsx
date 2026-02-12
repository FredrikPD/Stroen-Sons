type LoadingStateProps = {
    className?: string;
    label?: string;
    spinnerSizeClassName?: string;
};

export function LoadingState({
    className = "h-[50vh]",
    label = "Henter innhold...",
    spinnerSizeClassName = "h-8 w-8",
}: LoadingStateProps) {
    return (
        <div className={`flex items-center justify-center ${className}`}>
            <div className="flex flex-col items-center gap-3 text-center">
                <div className={`animate-spin rounded-full border-2 border-[#4F46E5]/25 border-t-[#4F46E5] ${spinnerSizeClassName}`} />
                <p className="text-xs font-semibold tracking-wide uppercase text-gray-500">{label}</p>
            </div>
        </div>
    );
}
