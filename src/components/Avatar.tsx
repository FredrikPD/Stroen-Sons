import React from "react";

type AvatarProps = {
    src?: string | null;
    initials?: string | null;
    alt?: string;
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    className?: string;
};

export const Avatar = ({
    src,
    initials,
    alt = "Avatar",
    size = "md",
    className = ""
}: AvatarProps) => {

    // Size mappings
    const sizeClasses = {
        xs: "w-6 h-6 text-[9px]",
        sm: "w-8 h-8 text-xs",
        md: "w-10 h-10 text-sm",
        lg: "w-12 h-12 text-base",
        xl: "w-16 h-16 text-xl",
    };

    const currentSize = sizeClasses[size] || sizeClasses.md;

    return (
        <div
            className={`
                ${currentSize} 
                rounded-full 
                flex items-center justify-center 
                overflow-hidden 
                bg-gradient-to-br from-[#222] to-[#444] 
                text-white font-bold 
                shadow-sm border border-white/10
                ${className}
            `}
            title={alt}
        >
            {src ? (
                <img
                    src={src}
                    alt={alt}
                    className="w-full h-full object-cover"
                />
            ) : (
                <span>{initials?.substring(0, 2).toUpperCase() || "?"}</span>
            )}
        </div>
    );
};
