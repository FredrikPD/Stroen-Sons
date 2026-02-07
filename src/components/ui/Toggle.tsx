import React from "react";

interface ToggleProps {
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
    loading?: boolean;
    className?: string;
}

export function Toggle({ checked, onChange, disabled = false, loading = false, className = "" }: ToggleProps) {
    return (
        <button
            type="button"
            onClick={onChange}
            disabled={disabled || loading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 
            ${checked ? 'bg-emerald-500' : 'bg-gray-200'} 
            ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} 
            ${className}`}
        >
            <span className="sr-only">Toggle setting</span>
            <span
                className={`${checked ? 'translate-x-6' : 'translate-x-1'} 
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
        </button>
    );
}
