"use client";

import { useUser, useSession } from "@clerk/nextjs";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { updateProfile } from "@/server/actions/account";
import { PushNotificationSettings } from "@/components/notifications/PushNotificationSettings";
import { LoadingState } from "@/components/ui/LoadingState";

interface AccountClientProps {
    initialProfile: any;
}

type PasswordStep = "initial" | "ready" | "success";

const inputClass = "w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors";
const labelClass = "text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400 block mb-1.5";

export default function AccountClient({ initialProfile }: AccountClientProps) {
    const { user, isLoaded } = useUser();
    const { session } = useSession();
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const [passwordStep, setPasswordStep] = useState<PasswordStep>("initial");
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        firstName: initialProfile?.firstName || "",
        lastName: initialProfile?.lastName || "",
        email: initialProfile?.email || "",
        phoneNumber: initialProfile?.phoneNumber || "",
        address: initialProfile?.address || "",
        zipCode: initialProfile?.zipCode || "",
        city: initialProfile?.city || "",
    });

    if (!isLoaded || !user || !session) {
        return <LoadingState className="h-96" />;
    }

    const handleStartVerification = async () => {
        setLoading(true);
        try {
            const emailAddressId = user.primaryEmailAddressId;
            if (!emailAddressId) {
                toast.error("Ingen primær e-postadresse funnet for verifisering.");
                return;
            }
            await session.startVerification({ level: "first_factor" });
            await session.prepareFirstFactorVerification({ strategy: "email_code", emailAddressId });
            toast.info("Bekreftelseskode sendt til din e-post.");
            setPasswordStep("ready");
        } catch (err: any) {
            if (err?.errors?.[0]?.code === "verification_already_prepared") {
                setPasswordStep("ready");
                toast.info("Bekreftelseskode allerede sendt. Sjekk e-posten din.");
            } else {
                toast.error(err?.errors?.[0]?.message || "Kunne ikke sende bekreftelseskode.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAndUpdate = async () => {
        if (!code || code.length < 6) { toast.error("Vennligst skriv inn en gyldig 6-sifret kode."); return; }
        if (!newPassword || newPassword.length < 8) { toast.error("Passordet må være på minst 8 tegn."); return; }

        setLoading(true);
        try {
            const verifyRes = await session.attemptFirstFactorVerification({ strategy: "email_code", code });
            if (verifyRes.status !== "complete") { toast.error("Verifisering feilet eller ufullstendig."); return; }
            await user.updatePassword({ newPassword });
            setPasswordStep("success");
            toast.success("Passord oppdatert!");
        } catch (err: any) {
            toast.error(err?.errors?.[0]?.message || "Kunne ikke oppdatere passord.");
        } finally {
            setLoading(false);
        }
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await updateProfile(formData);
            if (res.success) {
                toast.success("Profil oppdatert!");
                setIsEditing(false);
            } else {
                toast.error(res.error || "Kunne ikke oppdatere profil.");
            }
        } catch {
            toast.error("En uventet feil oppstod.");
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) { toast.error("Velg en bildefil."); e.target.value = ""; return; }
        if (file.size > 8 * 1024 * 1024) { toast.error("Bildet er for stort. Maks 8 MB."); e.target.value = ""; return; }

        setAvatarUploading(true);
        try {
            await user.setProfileImage({ file });
            await user.reload();
            toast.success("Profilbildet er oppdatert.");
        } catch (err: any) {
            toast.error(err?.errors?.[0]?.message || "Kunne ikke oppdatere profilbildet.");
        } finally {
            setAvatarUploading(false);
            e.target.value = "";
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Kontoinformasjon ────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-4 px-5 pt-5 pb-4 border-b border-gray-100">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Kontoinformasjon</span>
                    <div className="flex-1 h-px bg-gray-100" />
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                            Rediger
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsEditing(false)}
                            className="text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                            Avbryt
                        </button>
                    )}
                </div>

                <div className="p-5">
                    {!isEditing ? (
                        <div className="space-y-5">
                            {/* Avatar row */}
                            <div className="flex items-center gap-4 pb-5 border-b border-gray-100">
                                <div className="relative shrink-0">
                                    <img
                                        src={user.imageUrl}
                                        alt="Profilbilde"
                                        className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover ring-2 ring-gray-100"
                                    />
                                    <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarFileChange} className="hidden" />
                                    <button
                                        type="button"
                                        onClick={() => avatarInputRef.current?.click()}
                                        disabled={avatarUploading}
                                        className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-gray-900 text-white border-2 border-white flex items-center justify-center hover:bg-gray-700 transition-colors disabled:opacity-60"
                                        title="Bytt profilbilde"
                                    >
                                        {avatarUploading
                                            ? <span className="material-symbols-outlined text-[10px] animate-spin">progress_activity</span>
                                            : <span className="material-symbols-outlined text-[10px]">photo_camera</span>
                                        }
                                    </button>
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-gray-900">{formData.firstName} {formData.lastName}</p>
                                    <button
                                        type="button"
                                        onClick={() => avatarInputRef.current?.click()}
                                        disabled={avatarUploading}
                                        className="text-xs text-gray-400 hover:text-gray-700 transition-colors mt-0.5 disabled:opacity-60"
                                    >
                                        {avatarUploading ? "Laster opp..." : "Bytt profilbilde"}
                                    </button>
                                </div>
                            </div>

                            {/* Fields */}
                            <div className="space-y-4">
                                <div>
                                    <p className={labelClass}>E-post</p>
                                    <p className="text-sm text-gray-900">{formData.email}</p>
                                </div>
                                <div>
                                    <p className={labelClass}>Telefon</p>
                                    <p className="text-sm text-gray-900">
                                        {formData.phoneNumber || <span className="text-gray-400 italic">Ikke satt</span>}
                                    </p>
                                </div>
                                <div>
                                    <p className={labelClass}>Adresse</p>
                                    <p className="text-sm text-gray-900">
                                        {formData.address
                                            ? <>{formData.address}<br />{formData.zipCode} {formData.city}</>
                                            : <span className="text-gray-400 italic">Ingen adresse oppgitt</span>
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleProfileSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Fornavn</label>
                                    <input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className={inputClass} required />
                                </div>
                                <div>
                                    <label className={labelClass}>Etternavn</label>
                                    <input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className={inputClass} required />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>E-post</label>
                                <input type="email" value={formData.email} readOnly disabled className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-400 cursor-not-allowed" />
                                <p className="text-[10px] text-gray-300 mt-1">Kontakt support for å endre e-post.</p>
                            </div>
                            <div>
                                <label className={labelClass}>Telefon</label>
                                <input type="tel" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Adresse</label>
                                <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Gateadresse" className={`${inputClass} mb-2`} />
                                <div className="grid grid-cols-3 gap-2">
                                    <input type="text" value={formData.zipCode} onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })} placeholder="Postnr." className={inputClass} />
                                    <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Poststed" className={`${inputClass} col-span-2`} />
                                </div>
                            </div>
                            <div className="pt-1 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors">
                                    Avbryt
                                </button>
                                <button type="submit" disabled={loading} className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-700 transition-colors disabled:opacity-60">
                                    {loading ? "Lagrer..." : "Lagre endringer"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* ── Right column ────────────────────────────────────────── */}
            <div className="flex flex-col gap-6">

                {/* Password */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-4 px-5 pt-5 pb-4 border-b border-gray-100">
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Bytt passord</span>
                        <div className="flex-1 h-px bg-gray-100" />
                    </div>

                    <div className="p-5">
                        {passwordStep === "initial" && (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    Send en bekreftelseskode til e-post for å oppdatere passordet.
                                </p>
                                <button
                                    onClick={handleStartVerification}
                                    disabled={loading}
                                    className="w-full py-2.5 px-4 bg-gray-900 hover:bg-gray-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {loading ? "Sender..." : "Send bekreftelseskode"}
                                </button>
                            </div>
                        )}

                        {passwordStep === "ready" && (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-400">
                                    Kode sendt til <span className="font-bold text-gray-700">{user.primaryEmailAddress?.emailAddress}</span>.
                                </p>
                                <div>
                                    <label className={labelClass}>Bekreftelseskode</label>
                                    <input
                                        type="text"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        placeholder="6-sifret kode"
                                        className={`${inputClass} font-mono tracking-widest`}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Nytt passord</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Minst 8 tegn"
                                        className={inputClass}
                                    />
                                </div>
                                <button
                                    onClick={handleVerifyAndUpdate}
                                    disabled={loading || code.length < 6 || newPassword.length < 8}
                                    className="w-full py-2.5 px-4 bg-gray-900 hover:bg-gray-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-60"
                                >
                                    {loading ? "Oppdaterer..." : "Oppdater passord"}
                                </button>
                                <button
                                    onClick={() => { setPasswordStep("initial"); setCode(""); setNewPassword(""); }}
                                    className="w-full py-2 text-xs text-gray-400 hover:text-gray-700 font-bold transition-colors"
                                >
                                    Avbryt
                                </button>
                            </div>
                        )}

                        {passwordStep === "success" && (
                            <div className="flex flex-col items-center text-center py-4 gap-3">
                                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                                    <span className="material-symbols-outlined text-xl">check</span>
                                </div>
                                <p className="text-sm font-bold text-gray-900">Passord oppdatert</p>
                                <button
                                    onClick={() => { setPasswordStep("initial"); setCode(""); setNewPassword(""); }}
                                    className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl text-xs font-bold transition-colors"
                                >
                                    Ferdig
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <PushNotificationSettings className="flex flex-col" />
            </div>
        </div>
    );
}
