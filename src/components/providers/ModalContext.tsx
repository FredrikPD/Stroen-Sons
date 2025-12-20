"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { PremiumModal } from "@/components/ui/PremiumModal";

type ModalType = "info" | "success" | "warning" | "error";

interface ModalOptions {
    title: string;
    message: string;
    type?: ModalType;
    confirmText?: string;
    cancelText?: string;
}

interface ModalContextType {
    openAlert: (options: ModalOptions) => Promise<void>;
    openConfirm: (options: ModalOptions) => Promise<boolean>;
    closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ModalOptions | null>(null);
    const [resolver, setResolver] = useState<{ resolve: (value: boolean) => void } | null>(null);
    const [isConfirm, setIsConfirm] = useState(false);

    const openAlert = useCallback((opts: ModalOptions) => {
        return new Promise<void>((resolve) => {
            setOptions(opts);
            setIsConfirm(false);
            setResolver({ resolve: () => resolve() });
            setIsOpen(true);
        });
    }, []);

    const openConfirm = useCallback((opts: ModalOptions) => {
        return new Promise<boolean>((resolve) => {
            setOptions(opts);
            setIsConfirm(true);
            setResolver({ resolve });
            setIsOpen(true);
        });
    }, []);

    const closeModal = useCallback(() => {
        setIsOpen(false);
        if (resolver) {
            resolver.resolve(false); // Default to false if closed without explicit action
            setResolver(null);
        }
    }, [resolver]);

    const handleConfirm = useCallback(() => {
        setIsOpen(false);
        if (resolver) {
            resolver.resolve(true);
            setResolver(null);
        }
    }, [resolver]);

    const handleCancel = useCallback(() => {
        setIsOpen(false);
        if (resolver) {
            resolver.resolve(false);
            setResolver(null);
        }
    }, [resolver]);

    return (
        <ModalContext.Provider value={{ openAlert, openConfirm, closeModal }}>
            {children}
            {isOpen && options && (
                <PremiumModal
                    isOpen={isOpen}
                    title={options.title}
                    message={options.message}
                    type={options.type || "info"}
                    isConfirm={isConfirm}
                    confirmText={options.confirmText}
                    cancelText={options.cancelText}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            )}
        </ModalContext.Provider>
    );
}

export function useModal() {
    const context = useContext(ModalContext);
    if (context === undefined) {
        throw new Error("useModal must be used within a ModalProvider");
    }
    return context;
}
