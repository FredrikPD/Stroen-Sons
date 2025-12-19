"use client";

import { useState } from "react";
import { updatePassword, updateProfile } from "@/server/actions/account";
import { useRouter } from "next/navigation";

interface AccountClientProps {
    initialData: {
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        phoneNumber: string;
        address: string;
        zipCode: string;
        city: string;
    };
}

export default function AccountClient({ initialData }: AccountClientProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);

    // Profile State
    const [formData, setFormData] = useState({
        firstName: initialData.firstName,
        lastName: initialData.lastName,
        email: initialData.email,
        phoneNumber: initialData.phoneNumber,
        address: initialData.address,
        zipCode: initialData.zipCode,
        city: initialData.city,
    });

    // Password State
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const res = await updateProfile({
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phoneNumber: formData.phoneNumber,
            address: formData.address,
            zipCode: formData.zipCode,
            city: formData.city,
        });

        if (res.success) {
            setMessage({ type: 'success', text: "Profil oppdatert!" });
            router.refresh();
        } else {
            setMessage({ type: 'error', text: res.error || "Noe gikk galt." });
        }
        setLoading(false);
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: "Passordene er ikke like." });
            return;
        }
        if (password.length < 8) {
            setMessage({ type: 'error', text: "Passordet må være minst 8 tegn." });
            return;
        }

        setPasswordLoading(true);
        setMessage(null);

        const res = await updatePassword(password);

        if (res.success) {
            setMessage({ type: 'success', text: "Passord oppdatert!" });
            setPassword("");
            setConfirmPassword("");
        } else {
            setMessage({ type: 'error', text: res.error || "Kunne ikke oppdatere passord." });
        }
        setPasswordLoading(false);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* LEFT COLUMN: Profile Info */}
            <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-50 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2 relative z-10">
                        <span className="material-symbols-outlined text-zinc-400">id_card</span>
                        Personalia & Kontakt
                    </h2>

                    <form onSubmit={handleProfileUpdate} className="space-y-4 relative z-10">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fornavn</label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Etternavn</label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">E-post</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 transition-all"
                            />
                            <p className="text-[10px] text-amber-600 flex items-center gap-1 mt-1">
                                <span className="material-symbols-outlined text-[10px]">info</span>
                                Endring av e-post kan kreve ny verifisering.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Telefon (Valgfritt)</label>
                            <input
                                type="tel"
                                value={formData.phoneNumber}
                                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                placeholder="123 45 678"
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 transition-all"
                            />
                        </div>

                        <div className="pt-2 border-t border-gray-100 my-4"></div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Adresse (Valgfritt)</label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Storgata 1"
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-1 space-y-1.5">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Postnr</label>
                                <input
                                    type="text"
                                    value={formData.zipCode}
                                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                                    placeholder="0001"
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 transition-all"
                                />
                            </div>
                            <div className="col-span-2 space-y-1.5">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Poststed</label>
                                <input
                                    type="text"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    placeholder="Oslo"
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-lg">save</span>
                                        Lagre Endringer
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Feedback Message */}
                {message && (
                    <div className={`p-4 rounded-xl border flex items-center gap-3 ${message.type === 'success'
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                        : 'bg-red-50 border-red-100 text-red-700'
                        }`}>
                        <span className="material-symbols-outlined">
                            {message.type === 'success' ? 'check_circle' : 'error'}
                        </span>
                        <p className="text-sm font-medium">{message.text}</p>
                    </div>
                )}
            </div>

            {/* RIGHT COLUMN: Security & Info */}
            <div className="space-y-6">


                {/* Password Change */}
                <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm relative overflow-hidden">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-zinc-400">lock</span>
                        Sikkerhet
                    </h2>

                    <form onSubmit={handlePasswordUpdate} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nytt Passord</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Minst 8 tegn"
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bekreft Passord</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Gjenta passord"
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 transition-all"
                            />
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={passwordLoading}
                                className="w-full py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 hover:border-gray-300"
                            >
                                {passwordLoading ? (
                                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-lg">key</span>
                                        Oppdater Passord
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* MFA / Other Settings */}
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
                            <span className="material-symbols-outlined text-xl">shield_lock</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-amber-900">To-trinns bekreftelse (MFA)</h3>
                            <p className="text-xs text-amber-700/80 mt-1 leading-relaxed">
                                Øk sikkerheten på din konto ved å aktivere to-trinns bekreftelse. Dette administreres via vår sikkerhetsleverandør.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
