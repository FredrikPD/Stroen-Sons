"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const { isLoaded, signIn, setActive } = useSignIn();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [code, setCode] = useState("");
    const [step, setStep] = useState<"email" | "code">("email");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPw, setShowPw] = useState(false);

    // Step 1: Send Reset Code
    async function onRequestCode(e: React.FormEvent) {
        e.preventDefault();
        if (!isLoaded || !signIn) return;
        setError(null);
        setLoading(true);

        try {
            const res = await signIn.create({
                strategy: "reset_password_email_code",
                identifier: email,
            });

            if (res.status === "needs_first_factor") {
                setStep("code");
            } else {
                console.error("Unexpected status:", res.status, res);
                setError("Noe gikk galt. Prøv igjen.");
            }
        } catch (err: any) {
            console.error(err);
            const msg =
                err?.errors?.[0]?.longMessage ||
                err?.errors?.[0]?.message ||
                "Kunne ikke sende kode. Sjekk e-post.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    // Step 2: Verify Code and Set New Password
    async function onResetPassword(e: React.FormEvent) {
        e.preventDefault();
        if (!isLoaded || !signIn) return;
        setError(null);
        setLoading(true);

        try {
            const res = await signIn.attemptFirstFactor({
                strategy: "reset_password_email_code",
                code,
                password,
            });

            if (res.status === "complete") {
                await setActive({ session: res.createdSessionId });
                // Hard redirect to ensure session propagation
                window.location.replace("/dashboard");
            } else {
                console.error("Reset status:", res.status, res);
                setError(`Kunne ikke tilbakestille passord. Status: ${res.status}`);
                setLoading(false);
            }
        } catch (err: any) {
            console.error(err);
            const msg =
                err?.errors?.[0]?.longMessage ||
                err?.errors?.[0]?.message ||
                "Ugyldig kode eller passord. Prøv igjen.";
            setError(msg);
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen font-display bg-background-sidebar flex flex-col antialiased selection:bg-[#4F46E5] selection:text-white">
            {/* Background decoration */}
            <div className="fixed inset-0 z-0 w-full h-full pointer-events-none bg-background-sidebar">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-white/5 to-transparent" />
            </div>

            {/* Content */}
            <main className="relative z-10 flex-grow flex items-start justify-center px-4 sm:px-6 py-24">
                <div className="w-full max-w-[420px] flex flex-col gap-6">

                    {/* Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        {/* Centered Logo Header */}
                        <div className="flex flex-col items-center pt-6 pb-3">
                            <img
                                src="/images/LOGO.png"
                                alt="Strøen Søns"
                                className="w-20 h-20 rounded-2xl shadow-sm object-cover"
                            />
                        </div>

                        {/* Card Content with Padding */}
                        <div className="px-8 pb-8 pt-2">
                            <div className="mb-6">
                                <h2 className="text-xl font-bold text-gray-900">
                                    {step === "email" ? "Glemt passord" : "Nytt passord"}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    {step === "email"
                                        ? "Skriv inn e-posten din for å tilbakestille passordet."
                                        : `Vi har sendt en kode til ${email}.`}
                                </p>
                            </div>

                            {step === "email" ? (
                                // --- STEP 1: EMAIL FORM ---
                                <form className="flex flex-col gap-5" onSubmit={onRequestCode}>
                                    <div className="space-y-2">
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="material-symbols-outlined text-gray-400 group-focus-within:text-[#4F46E5] transition-colors text-xl">
                                                    mail
                                                </span>
                                            </div>

                                            <input
                                                id="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="block w-full rounded-xl border-gray-200 bg-gray-50
                                  pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400
                                  focus:border-[#4F46E5] focus:ring-[#4F46E5] sm:text-sm transition-all shadow-sm focus:bg-white"
                                                placeholder="Email"
                                                autoComplete="email"
                                                type="email"
                                                required
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
                                            <span className="material-symbols-outlined text-lg">error</span>
                                            <p className="font-medium">{error}</p>
                                        </div>
                                    )}

                                    <button
                                        disabled={loading}
                                        className="mt-2 flex w-full items-center justify-center rounded-xl bg-background-sidebar px-5 py-3 text-sm font-bold text-white
                    shadow-md shadow-gray-500/20
                    hover:bg-black hover:shadow-lg hover:shadow-gray-500/30
                    hover:-translate-y-[1px]
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900
                    transition-all duration-200 active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:hover:translate-y-0"
                                        type="submit"
                                    >
                                        {loading ? "Sender kode..." : "Send kode"}
                                        {!loading && <span className="material-symbols-outlined ml-2 text-lg">arrow_forward</span>}
                                    </button>

                                    <Link
                                        href="/sign-in"
                                        className="text-center text-sm text-gray-500 hover:text-gray-900 transition-colors"
                                    >
                                        Gå tilbake til innlogging
                                    </Link>
                                </form>
                            ) : (
                                // --- STEP 2: CODE AND PASSWORD FORM ---
                                <form className="flex flex-col gap-5" onSubmit={onResetPassword}>
                                    {/* Code */}
                                    <div className="space-y-2">
                                        <label
                                            className="text-xs font-bold text-gray-700 uppercase tracking-wide"
                                            htmlFor="code"
                                        >
                                            Engangskode
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="material-symbols-outlined text-gray-400 group-focus-within:text-[#4F46E5] transition-colors text-xl">
                                                    key
                                                </span>
                                            </div>
                                            <input
                                                id="code"
                                                value={code}
                                                onChange={(e) => setCode(e.target.value)}
                                                className="block w-full rounded-xl border-gray-200 bg-gray-50
                                  pl-10 pr-4 py-3 text-gray-900 
                                  focus:border-[#4F46E5] focus:ring-[#4F46E5] sm:text-sm transition-all shadow-sm focus:bg-white tracking-widest"
                                                placeholder="123456"
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete="one-time-code"
                                                required
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    {/* New Password */}
                                    <div className="space-y-2">
                                        <label
                                            className="text-xs font-bold text-gray-700 uppercase tracking-wide"
                                            htmlFor="password"
                                        >
                                            Nytt passord
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="material-symbols-outlined text-gray-400 group-focus-within:text-[#4F46E5] transition-colors text-xl">
                                                    lock
                                                </span>
                                            </div>

                                            <input
                                                id="password"
                                                className="block w-full rounded-xl border-gray-200 bg-gray-50
                                  pl-10 pr-10 py-3 text-gray-900
                                  focus:border-[#4F46E5] focus:ring-[#4F46E5] sm:text-sm shadow-sm focus:bg-white"
                                                type={showPw ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Nytt passord"
                                                required
                                                minLength={8}
                                            />

                                            <button
                                                type="button"
                                                onClick={() => setShowPw((s) => !s)}
                                                aria-label={showPw ? "Skjul passord" : "Vis passord"}
                                                className="absolute inset-y-0 right-0 pr-3 inline-flex items-center justify-center
                                  text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                <span className="material-symbols-outlined block text-[20px] leading-none">
                                                    {showPw ? "visibility_off" : "visibility"}
                                                </span>
                                            </button>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
                                            <span className="material-symbols-outlined text-lg">error</span>
                                            <p className="font-medium">{error}</p>
                                        </div>
                                    )}

                                    <button
                                        disabled={loading}
                                        className="mt-2 flex w-full items-center justify-center rounded-xl bg-[#4F46E5] px-5 py-3 text-sm font-bold text-white
                    shadow-md shadow-indigo-500/20
                    hover:bg-[#4338ca] hover:shadow-lg hover:shadow-indigo-500/30
                    hover:-translate-y-[1px]
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4F46E5]
                    transition-all duration-200 active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:hover:translate-y-0"
                                        type="submit"
                                    >
                                        {loading ? "Tilbakestiller..." : "Lagre nytt passord"}
                                        {!loading && <span className="material-symbols-outlined ml-2 text-lg">check_circle</span>}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStep("email");
                                            setError(null);
                                            setCode("");
                                            setPassword("");
                                        }}
                                        className="text-center text-sm text-gray-500 hover:text-gray-900 transition-colors"
                                    >
                                        Gå tilbake til start
                                    </button>
                                </form>
                            )}

                            {/* Footer */}
                            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                                <p className="text-xs text-gray-400">
                                    © 2025 Strøen Søns
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
