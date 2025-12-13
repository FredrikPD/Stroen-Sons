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
        setError("Innloggingen krevde et ekstra steg. Sjekk Clerk-innstillinger.");
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
    <div className="dark min-h-screen font-display bg-background-light dark:bg-background-dark flex flex-col antialiased selection:bg-primary selection:text-white">
      {/* Background */}
      <div className="fixed inset-0 z-0 w-full h-full pointer-events-none">
        <div className="absolute inset-0 bg-background-dark/80 z-10 backdrop-blur-[2px]" />
        <img
          alt="Dark moody abstract social club atmosphere with dim lighting"
          className="w-full h-full object-cover opacity-50 grayscale"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDSy86arc4Q78md_DN2sSI6jsDtd_pSaIsUma4ZRk24_7s_8uBsILW8TmirOfFBct9Xwc9e8rp0gs8J-k9AbwjuJb4Pmo1M52NTNu-CGqSjwlT5fMfrJlbApXKdikDXv46mUTrZql-lu24UTGw5tNqGv43aEBccx-rRE13riHNZ_7CcX767_fJKLkA3CySY_17TquHM6oasqTmNZXMBykZ9TL-j4wd8yNFolfT8o0-JevdOBwEnIzfxO-VmaPnBEb_ymO0EpouamMZI"
        />
      </div>

      {/* Content */}
      <main className="relative z-10 flex-grow flex items-start justify-center px-4 sm:px-6 pt-12 sm:pt-16 pb-10">
        <div className="w-full max-w-[480px] flex flex-col gap-2">
          {/* Branding */}
          <div className="flex flex-col items-center gap-2 mb-4">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Strøen Søns
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium tracking-wide uppercase">
              Medlemsportal
            </p>
          </div>

          {/* Card */}
          <div className="bg-white/80 dark:bg-[#161b26]/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl overflow-hidden p-8">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Velkommen
              </h2>
            </div>

            <form className="flex flex-col gap-5" onSubmit={onSubmit}>
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                    <label
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    htmlFor="email"
                    >
                    E-post
                    </label>

                    {/* valgfri høyre-side (tom for nå, men matcher passord-layouten) */}
                    <span className="text-xs font-medium opacity-0 select-none">placeholder</span>
                </div>

                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-gray-400 group-focus-within:text-primary transition-colors">
                        mail
                    </span>
                    </div>

                    <input
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0d121c]
                                pl-11 pr-4 py-3.5 text-gray-900 dark:text-white placeholder-gray-400
                                focus:border-primary focus:ring-primary sm:text-sm transition-all shadow-sm"
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
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    htmlFor="password"
                  >
                    Passord
                  </label>

                  {/* Midlertidig: du kan lage egen reset-side senere */}
                  <a
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    href="/sign-in"
                    onClick={(e) => {
                      e.preventDefault();
                      // Clerk sin "forgot password"-flyt er enklest med <SignIn />-komponenten.
                      // Si ifra hvis du vil at jeg skal legge den inn som egen side i samme design.
                      setError("Si ifra så lager vi en 'Glemt passord'-side i samme stil.");
                    }}
                  >
                    Glemt passord?
                  </a>
                </div>

                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-gray-400 group-focus-within:text-primary transition-colors">
                        lock
                        </span>
                    </div>

                    <input
                        id="password"
                        className="block w-full rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0d121c]
                                pl-11 pr-12 py-3.5 text-gray-900 dark:text-white
                                focus:border-primary focus:ring-primary sm:text-sm shadow-sm"
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
                                text-gray-400 hover:text-gray-300 transition-colors"
                    >
                        <span className="material-symbols-outlined block text-[22px] leading-none">
                        {showPw ? "visibility_off" : "visibility"}
                        </span>
                    </button>
                    </div>
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                disabled={loading}
                className="mt-4 flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3.5 text-base font-bold text-white
           shadow-lg shadow-primary/25 ring-1 ring-white/10
           hover:bg-blue-600 hover:shadow-2xl hover:shadow-primary/40 hover:ring-white/20
           hover:-translate-y-[1px]
           focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
           transition-all duration-200 active:translate-y-0 active:scale-[0.98] disabled:opacity-60"
                type="submit"
              >
                {loading ? "Logger inn..." : "Logg inn"}
                <span className="material-symbols-outlined ml-2 text-xl">arrow_forward</span>
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-500">
                © 2025 Strøen Søns. Alle rettigheter forbeholdt.
              </p>
              <div className="mt-4 flex justify-center gap-4 text-xs text-gray-400 dark:text-gray-600">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  Sikker tilkobling
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">verified_user</span>
                  Kun for medlemmer
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
