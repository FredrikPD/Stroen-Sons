"use client";

import React, { useEffect, useState } from "react";

type ModalType = "info" | "success" | "warning" | "error";

interface PremiumModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    type: ModalType;
    isConfirm: boolean;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function PremiumModal({
    isOpen,
    title,
    message,
    type,
    isConfirm,
    confirmText,
    cancelText,
    onConfirm,
    onCancel
}: PremiumModalProps) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Small delay to allow mount before animating
            requestAnimationFrame(() => setShow(true));
        } else {
            setShow(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Type definition for styling
    const styles = {
        info: {
            icon: "info",
            iconColor: "text-blue-500",
            iconBg: "bg-blue-50",
            buttonBg: "bg-blue-600 hover:bg-blue-700",
            buttonRing: "focus:ring-blue-500"
        },
        success: {
            icon: "check_circle",
            iconColor: "text-emerald-500",
            iconBg: "bg-emerald-50",
            buttonBg: "bg-emerald-600 hover:bg-emerald-700",
            buttonRing: "focus:ring-emerald-500"
        },
        warning: {
            icon: "warning",
            iconColor: "text-amber-500",
            iconBg: "bg-amber-50",
            buttonBg: "bg-amber-500 hover:bg-amber-600",
            buttonRing: "focus:ring-amber-500"
        },
        error: {
            icon: "error",
            iconColor: "text-red-500",
            iconBg: "bg-red-50",
            buttonBg: "bg-red-600 hover:bg-red-700",
            buttonRing: "focus:ring-red-500"
        }
    };

    const currentStyle = styles[type];

    return (
        <div className="fixed inset-0 z-[1000] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div
                className={`flex min-h-screen items-center justify-center p-4 text-center sm:p-0 transition-opacity duration-300 ease-in-out ${show ? "opacity-100" : "opacity-0"}`}
            >
                <div
                    className="fixed inset-0 bg-gray-900/40 transition-opacity"
                    onClick={onCancel} // Click outside to cancel
                    aria-hidden="true"
                />

                {/* Modal Panel */}
                <div
                    className={`relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all duration-300 ease-out sm:my-8 sm:w-full sm:max-w-lg scale-90 ${show ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"}`}
                >
                    <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            {/* Icon */}
                            <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${currentStyle.iconBg} sm:mx-0 sm:h-10 sm:w-10 mb-4 sm:mb-0`}>
                                <span className={`material-symbols-outlined text-2xl ${currentStyle.iconColor}`}>
                                    {currentStyle.icon}
                                </span>
                            </div>

                            {/* Content */}
                            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                                <h3 className="text-lg font-bold leading-6 text-gray-900" id="modal-title">
                                    {title}
                                </h3>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-500 leading-relaxed">
                                        {message}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-3">
                        <button
                            type="button"
                            className={`inline-flex w-full justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-transparent transition-all sm:ml-3 sm:w-auto ${currentStyle.buttonBg} ${currentStyle.buttonRing}`}
                            onClick={onConfirm}
                        >
                            {confirmText || "OK"}
                        </button>
                        {isConfirm && (
                            <button
                                type="button"
                                className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto transition-all"
                                onClick={onCancel}
                            >
                                {cancelText || "Avbryt"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
