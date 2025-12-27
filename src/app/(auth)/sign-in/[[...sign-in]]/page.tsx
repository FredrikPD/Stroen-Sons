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

  // Stats for 2FA / Client Trust
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isLoaded || !signIn) return;

    try {
      setLoading(true);

      const res = await signIn.create({
        identifier: email,
        password,
      });

      if (res.status === "complete") {
        await setActive({ session: res.createdSessionId });
        router.push("/dashboard");
      } else if (res.status === "needs_second_factor") {
        // Client Trust handling
        setLoading(true); // Keep loading state while preparing

        // Prepare the second factor (send email code)
        const factor = res.supportedSecondFactors?.find(
          (f) => f.strategy === "email_code"
        );

        if (factor) {
          await signIn.prepareSecondFactor({
            strategy: "email_code",
            emailAddressId: factor.emailAddressId,
          });

          // Get the safe identifier to show user (e.g. j***@example.com)
          // Clerk usually provides this in the factor object or we fallback
          const safeIdentifier = factor.safeIdentifier || email;
          setCodeSentTo(safeIdentifier);

          setVerifying(true);
        } else {
          setError("Din konto krever 2FA, men ingen støttet metode ble funnet (email_code).");
          console.error("No email_code factor found", res.supportedSecondFactors);
        }
      } else {
        console.error("Sign in status:", res.status, res);
        let message = "Innloggingen krevde et ekstra steg. Sjekk Clerk-innstillinger.";
        if (res.status === "needs_first_factor") {
          message = "Du må verifisere e-posten eller telefonnummeret ditt først.";
        } else if (res.status === "needs_new_password") {
          message = "Du må oppdatere passordet ditt.";
        }
        setError(`${message} (Status: ${res.status})`);
      }
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        "Kunne ikke logge inn. Sjekk brukernavn/e-post og passord.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setError(null);
    setLoading(true);

    try {
      const res = await signIn.attemptSecondFactor({
        strategy: "email_code",
        code,
      });

      if (res.status === "complete") {
        await setActive({ session: res.createdSessionId });
        router.push("/dashboard");
        router.refresh();
      } else {
        console.error("Verify status:", res.status, res);
        setError(`Kunne ikke verifisere. Status: ${res.status}`);
      }
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        "Ugyldig kode. Prøv igjen.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen font-display bg-gray-50 flex flex-col antialiased selection:bg-[#4F46E5] selection:text-white">
      {/* Background decoration */}
      <div className="fixed inset-0 z-0 w-full h-full pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-50/50 to-transparent" />
      </div>

      {/* Content */}
      <main className="relative z-10 flex-grow flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-[420px] flex flex-col gap-6">
          {/* Branding */}
          <div className="flex flex-col items-center gap-3">
            <img
              src="/SS-Logo-2.png"
              alt="Strøen Søns Logo"
              className="w-16 h-16 rounded-full shadow-md"
            />
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Strøen Søns
              </h1>
              <p className="text-gray-500 text-sm font-medium tracking-wide">
                Medlemsportal
              </p>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {verifying ? "Bekreft innlogging" : "Logg inn"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {verifying
                  ? `Vi har sendt en engangskode til ${codeSentTo || "din e-post"}.`
                  : "Velkommen tilbake! Vennligst logg inn på kontoen din."}
              </p>
            </div>

            {verifying ? (
              // --- VERIFICATION FORM ---
              <form className="flex flex-col gap-5" onSubmit={onVerify}>
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
                  {loading ? "Verifiserer..." : "Verifiser"}
                  {!loading && <span className="material-symbols-outlined ml-2 text-lg">check_circle</span>}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVerifying(false);
                    setError(null);
                    setCode("");
                  }}
                  className="text-center text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Gå tilbake til innlogging
                </button>
              </form>
            ) : (
              // --- LOGIN FORM ---
              <form className="flex flex-col gap-5" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <label
                    className="text-xs font-bold text-gray-700 uppercase tracking-wide"
                    htmlFor="email"
                  >
                    E-post
                  </label>

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
                      placeholder="navn@domene.no"
                      autoComplete="email"
                      type="email"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label
                      className="text-xs font-bold text-gray-700 uppercase tracking-wide"
                      htmlFor="password"
                    >
                      Passord
                    </label>

                    <a
                      className="text-xs font-medium text-[#4F46E5] hover:text-[#4338ca] transition-colors"
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
                      placeholder="••••••••"
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

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
                    <span className="material-symbols-outlined text-lg">error</span>
                    <p className="font-medium">{error}</p>
                  </div>
                )}

                {/* Submit */}
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
                  {loading ? "Logger inn..." : "Logg inn"}
                  {!loading && <span className="material-symbols-outlined ml-2 text-lg">arrow_forward</span>}
                </button>
              </form>
            )}

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">
                © 2025 Gutteklubben. Alle rettigheter forbeholdt.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
