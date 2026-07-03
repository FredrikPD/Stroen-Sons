"use client";

import { useActionState, useState, useRef, useEffect } from "react";
import { inviteMember } from "@/server/actions/invite-member";
import { ActionInfo } from "@/components/ui/ActionInfo";
import { SERIF, label, input, btnPrimary } from "@/components/admin/ui";

export default function InviteMemberForm({ availableRoles }: { availableRoles: { id: string, name: string }[] }) {
    const [state, formAction, isPending] = useActionState(inviteMember, {});
    const formRef = useRef<HTMLFormElement>(null);

    // Initial preview state
    const initialPreview = {
        firstName: "",
        lastName: "",
        roleName: availableRoles.find(r => r.name === "Member")?.name || availableRoles[0]?.name || "Medlem",
        type: "STANDARD",
        email: ""
    };

    // Local state for preview
    const [preview, setPreview] = useState(initialPreview);

    // Reset form and preview on success or error
    useEffect(() => {
        if (state.message || state.error) {
            setPreview(initialPreview);
            formRef.current?.reset();
        }
    }, [state, availableRoles]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === "roleId") {
            const roleName = availableRoles.find(r => r.id === value)?.name || "";
            setPreview(prev => ({ ...prev, roleName }));
        } else {
            setPreview(prev => ({ ...prev, [name]: value }));
        }
    };

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

                {/* Left Side: The Form */}
                <div className="space-y-8">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">Brukeradministrasjon</p>
                        <h1 className="text-3xl sm:text-4xl font-normal text-gray-900 leading-none" style={{ fontFamily: SERIF }}>Inviter Nytt Medlem</h1>
                        <p className="text-gray-500 mt-3">Opprett tilgang og send invitasjon.</p>
                    </div>

                    <ActionInfo variant="info" icon="mail" title="Hva skjer når du sender invitasjonen?">
                        Personen får en e-post fra oss med en lenke for å opprette bruker. Medlemmet blir samtidig lagt inn med status «ventende» og får rollen og medlemskapstypen du velger her – velger du Admin, får personen full admin-tilgang så snart invitasjonen godtas. Ingen faktura opprettes nå; kontingent kommer først når medlemmet er aktivt.
                    </ActionInfo>

                    <form ref={formRef} action={formAction} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className={label}>Fornavn</label>
                                <input
                                    name="firstName"
                                    type="text"
                                    required
                                    className={input}
                                    placeholder="Ola"
                                    onChange={handleChange}
                                />
                                {state.fieldErrors?.firstName && <p className="text-red-500 text-xs">{state.fieldErrors.firstName}</p>}
                            </div>
                            <div className="space-y-2">
                                <label className={label}>Etternavn</label>
                                <input
                                    name="lastName"
                                    type="text"
                                    required
                                    className={input}
                                    placeholder="Nordmann"
                                    onChange={handleChange}
                                />
                                {state.fieldErrors?.lastName && <p className="text-red-500 text-xs">{state.fieldErrors.lastName}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className={label}>E-postadresse</label>
                            <input
                                name="email"
                                type="email"
                                required
                                className={input}
                                placeholder="ola@eksempel.no"
                                onChange={handleChange}
                            />
                            {state.fieldErrors?.email && <p className="text-red-500 text-xs">{state.fieldErrors.email}</p>}
                        </div>



                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className={label}>Rolle</label>
                                <div className="relative">
                                    <select
                                        name="roleId"
                                        className={`${input} appearance-none pr-10`}
                                        onChange={handleChange}
                                        defaultValue={availableRoles.find(r => r.name === "Member")?.id || ""}
                                    >
                                        <option value="" disabled>Velg rolle...</option>
                                        {availableRoles.map(role => (
                                            <option key={role.id} value={role.id}>{role.name}</option>
                                        ))}
                                    </select>
                                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-lg">expand_more</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className={label}>Medlemskap</label>
                                <div className="relative">
                                    <select
                                        name="membershipType"
                                        className={`${input} appearance-none pr-10`}
                                        onChange={handleChange}
                                        defaultValue="STANDARD"
                                    >
                                        <option value="STANDARD">Standard</option>
                                        <option value="HONORARY">Æresmedlem</option>
                                        <option value="TRIAL">Prøvemedlem</option>
                                        <option value="SUPPORT">Støttemedlem</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-lg">expand_more</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isPending}
                                className={`${btnPrimary} w-full h-12`}
                            >
                                {isPending ? (
                                    <>
                                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></span>
                                        Oppretter...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">send</span>
                                        Send Invitasjon
                                    </>
                                )}
                            </button>
                        </div>

                        {state.message && (
                            <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                                <span className="material-symbols-outlined text-lg">check_circle</span>
                                {state.message}
                            </div>
                        )}
                        {state.error && (
                            <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                                <span className="material-symbols-outlined text-lg">error</span>
                                {state.error}
                            </div>
                        )}
                    </form>
                </div>

                {/* Right Side: The Creative 'Card' Preview */}
                <div className="hidden lg:flex flex-col items-center justify-center h-full min-h-[500px] relative">
                    <div className="absolute inset-0 bg-gradient-to-tr from-cream to-primary/5 rounded-3xl -z-10 blur-3xl opacity-60" />

                    {/* Perspective Container */}
                    <div className="relative group perspective-1000">
                        {/* The Card */}
                        <div
                            className="w-[380px] h-[240px] text-white rounded-2xl p-6 relative overflow-hidden shadow-2xl transition-transform duration-500 hover:rotate-y-6 hover:scale-105 transform-style-3d"
                            style={{ background: "linear-gradient(150deg, #1b1a16 0%, #0f0e0c 62%)" }}
                        >

                            {/* Decorative Background Elements — warm gold glow */}
                            <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary rounded-full mix-blend-overlay filter blur-3xl opacity-25" />
                            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-primary rounded-full mix-blend-overlay filter blur-3xl opacity-15" />
                            <span
                                aria-hidden
                                className="pointer-events-none absolute -right-4 -bottom-8 select-none leading-none text-white/[0.04]"
                                style={{ fontFamily: SERIF, fontSize: "12rem" }}
                            >
                                S
                            </span>

                            {/* Card Content */}
                            <div className="relative z-10 flex flex-col justify-between h-full">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-cream-muted font-medium">Medlemskort</p>
                                        <h3 className="text-lg font-normal mt-1 tracking-wide" style={{ fontFamily: SERIF }}>STRØEN SØNS</h3>
                                    </div>
                                    <div className="w-8 h-8 rounded-full border border-primary/40 text-primary flex items-center justify-center">
                                        <span className="material-symbols-outlined text-base">verified</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center border border-primary/20 backdrop-blur-sm">
                                            <span className="text-xl font-medium" style={{ fontFamily: SERIF }}>
                                                {preview.firstName ? preview.firstName[0].toUpperCase() : "?"}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold truncate max-w-[180px]">
                                                {preview.firstName || "Fornavn"} {preview.lastName || "Etternavn"}
                                            </p>
                                            <p className="text-[10px] text-gray-400 truncate max-w-[180px]">
                                                {preview.email || "e-post"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-end border-t border-white/10 pt-4">
                                        <div>
                                            <p className="text-[10px] text-cream-muted uppercase tracking-wider">Rolle</p>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <div className={`w-1.5 h-1.5 rounded-full ${preview.roleName === 'Admin' ? 'bg-primary' : preview.roleName === 'Moderator' ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`} />
                                                <span className="text-xs font-semibold tracking-wide">
                                                    {preview.roleName}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-cream-muted uppercase tracking-wider">Type</p>
                                            <p className="text-xs font-semibold tracking-wide">{preview.type}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Card Reflection/Shadow for depth */}
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[90%] h-4 bg-black/20 blur-xl rounded-full" />
                    </div>

                    <div className="mt-8 text-center max-w-xs">
                        <p className="text-sm font-medium text-gray-900">Forhåndsvisning</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
