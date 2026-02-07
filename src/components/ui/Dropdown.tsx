"use client";

import React, { useState, useRef, useEffect, ReactNode } from "react";

interface DropdownProps {
    trigger: ReactNode;
    children: ReactNode;
    align?: "left" | "right";
}

export function Dropdown({ trigger, children, align = "right" }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <div onClick={() => setIsOpen(!isOpen)}>
                {trigger}
            </div>

            {isOpen && (
                <div
                    className={`absolute ${align === "right" ? "right-0" : "left-0"} z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none animate-in fade-in zoom-in-95 duration-100`}
                >
                    <div className="py-1" role="menu" aria-orientation="vertical">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
}

interface DropdownItemProps {
    children: ReactNode;
    onClick?: () => void;
    className?: string;
    danger?: boolean;
}

export function DropdownItem({ children, onClick, className = "", danger = false }: DropdownItemProps) {
    return (
        <button
            type="button"
            className={`flex w-full items-center px-4 py-2 text-sm text-left transition-colors ${danger
                    ? "text-red-600 hover:bg-red-50"
                    : "text-gray-700 hover:bg-gray-100"
                } ${className}`}
            role="menuitem"
            onClick={onClick}
        >
            {children}
        </button>
    );
}
