"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";

export default function SignInPage() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isLoaded || !signIn) return;

    try {
      setLoading(true);

      const res = await signIn.create({
        identifier: email, // e-post eller username (avhengig av Clerk settings)
        password,
      });

      if (res.status === "complete") {
        await setActive({ session: res.createdSessionId });
        router.push("/dashboard");
      } else {
        // Log detailed status for debugging
        console.error("Sign in status:", res.status, res);

        let message = "Innloggingen krevde et ekstra steg. Sjekk Clerk-innstillinger.";
        if (res.status === "needs_first_factor") {
          message = "Du må verifisere e-posten eller telefonnummeret ditt først.";
        } else if (res.status === "needs_second_factor") {
          message = "To-faktor autentisering er påkrevd, men ikke støttet i dette skjemaet ennå.";
        } else if (res.status === "needs_new_password") {
          message = "Du må oppdatere passordet ditt.";
        }

        setError(`${message} (Status: ${res.status})`);
      }
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        "Kunne ikke logge inn. Sjekk brukernavn/e-post og passord.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen font-display bg-[#222222] flex flex-col antialiased selection:bg-[#BFA181] selection:text-white">
      {/* Background Image (Optional, kept low opacity for texture) */}
      <div className="fixed inset-0 z-0 w-full h-full pointer-events-none">
        <div className="absolute inset-0 bg-[#222222]/90 z-10" />
        <img
          alt="Dark moody abstract social club atmosphere with dim lighting"
          className="w-full h-full object-cover opacity-40 grayscale"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDSy86arc4Q78md_DN2sSI6jsDtd_pSaIsUma4ZRk24_7s_8uBsILW8TmirOfFBct9Xwc9e8rp0gs8J-k9AbwjuJb4Pmo1M52NTNu-CGqSjwlT5fMfrJlbApXKdikDXv46mUTrZql-lu24UTGw5tNqGv43aEBccx-rRE13riHNZ_7CcX767_fJKLkA3CySY_17TquHM6oasqTmNZXMBykZ9TL-j4wd8yNFolfT8o0-JevdOBwEnIzfxO-VmaPnBEb_ymO0EpouamMZI"
        />
      </div>

      {/* Content */}
      <main className="relative z-10 flex-grow flex items-start justify-center px-4 sm:px-6 pt-6 sm:pt-12 pb-10">
        <div className="w-full max-w-[480px] flex flex-col gap-2">
          {/* Branding */}
          <div className="flex flex-col items-center gap-2 mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Strøen Søns
            </h1>
            <p className="text-white/60 text-sm font-medium tracking-wide uppercase">
              Medlemsportal
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden p-8">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Logg inn
              </h2>
            </div>

            <form className="flex flex-col gap-5" onSubmit={onSubmit}>
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label
                    className="text-sm font-bold text-gray-700"
                    htmlFor="email"
                  >
                    E-post
                  </label>
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-gray-400 group-focus-within:text-[#BFA181] transition-colors">
                      mail
                    </span>
                  </div>

                  <input
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-xl border-gray-200 bg-gray-50
                                pl-11 pr-4 py-3.5 text-gray-900 placeholder-gray-400
                                focus:border-[#BFA181] focus:ring-[#BFA181] sm:text-sm transition-all shadow-sm focus:bg-white"
                    placeholder="navn@domene.no"
                    autoComplete="email"
                    type="email"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label
                    className="text-sm font-bold text-gray-700"
                    htmlFor="password"
                  >
                    Passord
                  </label>

                  <a
                    className="text-xs font-bold text-[#BFA181] hover:text-[#a88b6b] transition-colors"
                    href="/sign-in"
                    onClick={(e) => {
                      e.preventDefault();
                      setError("Si ifra så lager vi en 'Glemt passord'-side i samme stil.");
                    }}
                  >
                    Glemt passord?
                  </a>
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-gray-400 group-focus-within:text-[#BFA181] transition-colors">
                      lock
                    </span>
                  </div>

                  <input
                    id="password"
                    className="block w-full rounded-xl border-gray-200 bg-gray-50
                                pl-11 pr-12 py-3.5 text-gray-900
                                focus:border-[#BFA181] focus:ring-[#BFA181] sm:text-sm shadow-sm focus:bg-white"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? "Skjul passord" : "Vis passord"}
                    className="absolute inset-y-0 right-0 pr-3 inline-flex items-center justify-center
                                text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <span className="material-symbols-outlined block text-[22px] leading-none">
                      {showPw ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 font-medium">
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                disabled={loading}
                className="mt-4 flex w-full items-center justify-center rounded-xl bg-[#BFA181] px-5 py-3.5 text-base font-bold text-[#2A2A2A]
           shadow-lg shadow-[#BFA181]/25 ring-1 ring-white/10
           hover:bg-[#a88b6b] hover:shadow-2xl hover:shadow-[#BFA181]/40
           hover:-translate-y-[1px]
           focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BFA181]
           transition-all duration-200 active:translate-y-0 active:scale-[0.98] disabled:opacity-60"
                type="submit"
              >
                {loading ? "Logger inn..." : "Logg inn"}
                <span className="material-symbols-outlined ml-2 text-xl">login</span>
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">
                © 2025 Gutteklubben. Alle rettigheter forbeholdt.
              </p>
              <div className="mt-4 flex justify-center gap-4 text-xs text-gray-300">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  Sikker tilkobling
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
