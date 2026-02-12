"use client";

import { useUser, useSession } from "@clerk/nextjs";
import { useState } from "react";
import { toast } from "sonner";
import { updateProfile } from "@/server/actions/account";
import { PushNotificationSettings } from "@/components/notifications/PushNotificationSettings";

interface AccountClientProps {
    initialProfile: any; // Ideally stricter type from Prisma
}

type PasswordStep = "initial" | "ready" | "success";

export default function AccountClient({ initialProfile }: AccountClientProps) {
    const { user, isLoaded } = useUser();
    const { session } = useSession();

    // Password Update State
    const [passwordStep, setPasswordStep] = useState<PasswordStep>("initial");
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(false);

    // Profile Edit State
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
        return (
            <div className="w-full h-96 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    const formatPhoneNumber = (phone: string) => phone;

    /**
     * Start the verification process by sending a code.
     */
    const handleStartVerification = async () => {
        setLoading(true);
        try {
            const emailAddressId = user.primaryEmailAddressId;
            if (!emailAddressId) {
                toast.error("Ingen primær e-postadresse funnet for verifisering.");
                return;
            }

            // Start step-up / reverification flow
            await session.startVerification({ level: "first_factor" });

            // Send code
            await session.prepareFirstFactorVerification({
                strategy: "email_code",
                emailAddressId,
            });

            toast.info("Bekreftelseskode sendt til din e-post.");
            setPasswordStep("ready");
        } catch (err: any) {
            console.error("Error sending code:", err);
            // If already prepared, proceed to ready step
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

    /**
     * Verify the code AND update the password in one go.
     */
    const handleVerifyAndUpdate = async () => {
        if (!code || code.length < 6) {
            toast.error("Vennligst skriv inn en gyldig 6-sifret kode.");
            return;
        }
        if (!newPassword || newPassword.length < 8) {
            toast.error("Passordet må være på minst 8 tegn.");
            return;
        }

        setLoading(true);
        try {
            // 1. Attempt verification
            const verifyRes = await session.attemptFirstFactorVerification({
                strategy: "email_code",
                code,
            });

            if (verifyRes.status !== "complete") {
                toast.error("Verifisering feilet eller ufullstendig.");
                // If failed, user might need to re-enter code, but stay on "ready" step
                return;
            }

            // 2. Verification complete -> Update Password
            await user.updatePassword({ newPassword });

            setPasswordStep("success");
            toast.success("Passord oppdatert!");
        } catch (err: any) {
            console.error("Error updating password:", err);
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
        } catch (err) {
            console.error("Error updating profile:", err);
            toast.error("En uventet feil oppstod.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
            {/* Left Column: Account Info (Editable) */}
            <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm relative">
                    <div className="absolute top-8 right-8">
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-lg">edit</span>
                                Rediger
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsEditing(false)}
                                className="text-sm font-bold text-gray-500 hover:text-gray-700 flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                                Avbryt
                            </button>
                        )}
                    </div>

                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-600">person</span>
                        Kontoinformasjon
                    </h2>

                    {!isEditing ? (
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                                <img
                                    src={user.imageUrl}
                                    alt="Profilbilde"
                                    className="w-16 h-16 rounded-full border-2 border-white shadow-sm"
                                />
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">
                                        {formData.firstName} {formData.lastName}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        Medlem siden {user.createdAt ? new Date(user.createdAt).getFullYear() : "N/A"}
                                    </p>
                                </div>
                            </div>
                            {/* Display fields... I'll keep the existing structure but shortened request here */}
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">E-post</label>
                                    <div className="text-gray-900 font-medium">{formData.email}</div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Telefon</label>
                                    <div className="text-gray-900 font-medium">
                                        {formData.phoneNumber ? formatPhoneNumber(formData.phoneNumber) : <span className="text-gray-400 italic">Ikke satt</span>}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Adresse</label>
                                    <div className="text-gray-900 font-medium">
                                        {formData.address ? (
                                            <>
                                                {formData.address}<br />
                                                {formData.zipCode} {formData.city}
                                            </>
                                        ) : (
                                            <span className="text-gray-400 italic">Ingen adresse oppgitt</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleProfileSubmit} className="space-y-4">
                            {/* Form fields same as before... */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Fornavn</label>
                                    <input
                                        type="text"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Etternavn</label>
                                    <input
                                        type="text"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">E-post</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    readOnly
                                    disabled
                                    className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Kontakt support for å endre e-post.</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Telefon</label>
                                <input
                                    type="tel"
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Adresse</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Gateadresse"
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none mb-2"
                                />
                                <div className="grid grid-cols-3 gap-2">
                                    <input
                                        type="text"
                                        value={formData.zipCode}
                                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                                        placeholder="Postnummer"
                                        className="col-span-1 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                    />
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        placeholder="Poststed"
                                        className="col-span-2 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                    />
                                </div>
                            </div>
                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors"
                                >
                                    Avbryt
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-70"
                                >
                                    {loading ? "Lagrer..." : "Lagre endringer"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* Right Column: Password Reset */}
            <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm h-full">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-600">lock_reset</span>
                        Bytt passord
                    </h2>

                    {passwordStep === "initial" && (
                        <div className="space-y-4">
                            <p className="text-gray-600 text-sm">
                                For å bytte passord må vi først bekrefte din identitet. Klikk på knappen under for å sende en bekreftelseskode til din e-post.
                            </p>
                            <button
                                onClick={handleStartVerification}
                                disabled={loading}
                                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-100 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? "Sender..." : "Send bekreftelseskode"}
                            </button>
                        </div>
                    )}

                    {passwordStep === "ready" && (
                        <div className="space-y-4">
                            <p className="text-gray-600 text-sm mb-4">
                                En bekreftelseskode er sendt til <strong>{user.primaryEmailAddress?.emailAddress}</strong>.
                            </p>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Bekreftelseskode
                                </label>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="Skriv inn 6-sifret kode"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-mono tracking-widest focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Nytt passord
                                </label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Skriv inn nytt passord"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>

                            <button
                                onClick={handleVerifyAndUpdate}
                                disabled={loading || code.length < 6 || newPassword.length < 8}
                                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-100 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                            >
                                {loading ? "Oppdaterer..." : "Oppdater passord"}
                            </button>

                            <button
                                onClick={() => {
                                    setPasswordStep("initial");
                                    setCode("");
                                    setNewPassword("");
                                }}
                                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 font-medium"
                            >
                                Avbryt
                            </button>
                        </div>
                    )}

                    {passwordStep === "success" && (
                        <div className="flex flex-col items-center justify-center text-center py-8 space-y-4">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                                <span className="material-symbols-outlined text-3xl">check</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Suksess!</h3>
                            <p className="text-gray-500 text-sm">Ditt passord er oppdatert.</p>
                            <button
                                onClick={() => {
                                    setPasswordStep("initial");
                                    setCode("");
                                    setNewPassword("");
                                }}
                                className="mt-4 px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-bold text-sm transition-colors"
                            >
                                Ferdig
                            </button>
                        </div>
                    )}
                </div>

                <PushNotificationSettings />
            </div>
        </div>
    );
}
