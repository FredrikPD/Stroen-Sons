"use client";

import { useState } from "react";
// If sonner isn't installed, I'll valid check package.json or just use a local state for feedback.
// Given I cannot easily check package.json right now without another step, I'll use local state for the feedback to be safe and robust.

export function BankInfoCard({ memberId }: { memberId: string }) {
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);

        // Simple feedback timeout
        setTimeout(() => setCopiedField(null), 2000);
    };

    return (
        <div className="bg-[#0F172A] text-white p-6 rounded-xl shadow-md flex flex-col relative overflow-hidden">
            {/* Background Icon */}
            <div className="absolute top-4 right-4 text-white/5 pointer-events-none">
                <span className="material-symbols-outlined text-[5rem]">account_balance</span>
            </div>

            <h3 className="font-bold text-sm mb-6 relative z-10">Klubbens Konto</h3>

            <div className="space-y-4 relative z-10">
                <div>
                    <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">KONTONUMMER</p>
                    <button
                        onClick={() => handleCopy("1234.56.78903", "account")}
                        className="flex items-center gap-2 group cursor-pointer active:opacity-70 transition-opacity w-full text-left"
                        title="Klikk for å kopiere"
                    >
                        <span className="font-mono text-lg tracking-wide font-medium">1234.56.78903</span>
                        <span className={`material-symbols-outlined text-sm transition-colors ${copiedField === "account" ? "text-green-400" : "text-white/30 group-hover:text-white"
                            }`}>
                            {copiedField === "account" ? "check" : "content_copy"}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
