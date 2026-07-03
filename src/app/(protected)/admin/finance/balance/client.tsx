"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentMember } from "@/server/actions/finance";
import { Avatar } from "@/components/Avatar";

type PaymentRequest = {
    id: string;
    title: string;
    description: string | null;
    amount: number;
    status: "PENDING" | "PAID" | "WAIVED";
    category: "MEMBERSHIP_FEE" | "EVENT" | "OTHER";
    dueDate: string | null;
};

type MemberBalance = {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    balance: number;
    unpaidCount: number;
    requests: PaymentRequest[];
};

import { sendBulkPaymentReminders, sendPaymentReminder } from "@/server/actions/emails";
import { PremiumModal } from "@/components/ui/PremiumModal";
import { LoadingState } from "@/components/ui/LoadingState";
import { AdminPageHeader, SERIF, input as inputClass } from "@/components/admin/ui";

export default function MemberBalancePage() {
    const [members, setMembers] = useState<MemberBalance[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
    const [emailSending, setEmailSending] = useState(false);

    // Modal State
    const [modal, setModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        type: "info" as "info" | "success" | "warning" | "error",
        isConfirm: false,
        onConfirm: () => { }
    });

    const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

    // We can use a map to track loading state for individual items if needed, 
    // but for now global lock is safer to prevent spam.

    const router = useRouter();

    useEffect(() => {
        const checkAuthAndFetch = async () => {
            const member = await getCurrentMember();
            if (!member || member.role !== "ADMIN") {
                router.push("/dashboard");
                return;
            }

            try {
                const res = await fetch("/api/admin/finance/balance");
                if (res.ok) {
                    const data = await res.json();
                    setMembers(data);
                }
            } catch (error) {
                console.error("Failed to fetch member balances", error);
            } finally {
                setLoading(false);
            }
        };
        checkAuthAndFetch();
    }, [router]);

    const handleBulkReminder = async () => {
        const hasUnpaidMembers = members.some(m => m.unpaidCount > 0);
        if (!hasUnpaidMembers) {
            setModal({
                isOpen: true,
                title: "Ingen mottakere",
                message: "Det finnes ingen medlemmer med ubetalte krav. Ingen e-poster trenger å sendes.",
                type: "info",
                isConfirm: false,
                onConfirm: closeModal
            });
            return;
        }

        setModal({
            isOpen: true,
            title: "Bekreft utsending",
            message: "Sender en e-post til hvert aktive medlem som har minst ett ubetalt krav (status «Ubetalt»). Hver mottaker får kun sine egne ubetalte fakturaer listet, med lenke til betaling.\n\n- E-postene sendes med en gang og kan ikke angres.\n- Betalte og fritatte krav tas ikke med.\n- Saldo eller status endres ikke.",
            type: "warning",
            isConfirm: true,
            onConfirm: async () => {
                closeModal();
                setEmailSending(true);
                const res = await sendBulkPaymentReminders();
                setEmailSending(false);

                if (res.success) {
                    setModal({
                        isOpen: true,
                        title: "E-poster sendt",
                        message: `Sendte betalingspåminnelse til ${res.count} medlemmer.`,
                        type: "success",
                        isConfirm: false,
                        onConfirm: closeModal
                    });
                } else {
                    setModal({
                        isOpen: true,
                        title: "Noe gikk galt",
                        message: "Kunne ikke sende e-poster: " + res.error,
                        type: "error",
                        isConfirm: false,
                        onConfirm: closeModal
                    });
                }
            }
        });
    };

    const handleSingleReminder = async (memberId: string, requestId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        setModal({
            isOpen: true,
            title: "Send påminnelse",
            message: "Sender en e-post til dette medlemmet om akkurat denne fakturaen, med lenke til betaling.\n\nE-posten sendes med en gang og kan ikke angres. Knappen vises for alle ubetalte krav, også de som ennå ikke har forfalt.",
            type: "warning",
            isConfirm: true,
            onConfirm: async () => {
                closeModal();
                setEmailSending(true);
                const res = await sendPaymentReminder(memberId, [requestId]);
                setEmailSending(false);

                if (res.success) {
                    setModal({
                        isOpen: true,
                        title: "Påminnelse sendt",
                        message: "Betalingspåminnelse er sendt på e-post til medlemmet.",
                        type: "success",
                        isConfirm: false,
                        onConfirm: closeModal
                    });
                } else {
                    setModal({
                        isOpen: true,
                        title: "Noe gikk galt",
                        message: "Kunne ikke sende påminnelse: " + res.error,
                        type: "error",
                        isConfirm: false,
                        onConfirm: closeModal
                    });
                }
            }
        });
    };

    const filteredMembers = members.filter(member =>
        member.name.toLowerCase().includes(search.toLowerCase()) ||
        member.email.toLowerCase().includes(search.toLowerCase())
    );

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("nb-NO", {
            style: "currency",
            currency: "NOK",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString("nb-NO", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    };

    if (loading) {
        return <LoadingState />;
    }

    return (
        <div className="min-w-0">
            {/* Header */}
            <AdminPageHeader
                eyebrow="Økonomi"
                title="Saldo og Historikk"
                description="Oversikt over medlemmenes betalingskrav og historikk."
                actions={
                    <button
                        onClick={handleBulkReminder}
                        disabled={emailSending}
                        className="flex items-center gap-3 bg-primary/10 text-gray-900 hover:border-primary/50 pl-4 pr-5 py-3 rounded-xl transition-all border border-primary/20 disabled:opacity-50 group text-left"
                    >
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary group-hover:bg-[#0f0e0c] group-hover:text-white transition-all">
                            <span className="material-symbols-outlined text-xl">mark_email_unread</span>
                        </div>
                        <div className="max-w-[200px]">
                            <span className="block font-bold text-sm">Send E-post Varsel</span>
                            <span className="block text-xs text-text-secondary font-normal leading-snug">Sender e-post påminnelse til alle medlemmer med ubetalte krav.</span>
                        </div>
                    </button>
                }
            />

            {/* Search */}
            <div className="relative mb-6">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined z-10">search</span>
                <input
                    type="text"
                    placeholder="Søk etter navn eller e-post..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={`${inputClass} h-12 pl-12`}
                />
            </div>

            {/* Members List */}
            <div className="space-y-4 min-w-0">
                {filteredMembers.map((member) => (
                    <div key={member.id} className="bg-white border border-border-color rounded-2xl overflow-hidden transition-all duration-200 hover:border-gray-300 hover:shadow-sm min-w-0">
                        {/* Member Row Header */}
                        <div
                            onClick={() => setExpandedMemberId(expandedMemberId === member.id ? null : member.id)}
                            className="p-4 sm:p-6 cursor-pointer group"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                    <Avatar
                                        src={member.avatarUrl ?? null}
                                        initials={member.name.substring(0, 2).toUpperCase()}
                                        alt={member.name}
                                        className={`w-9 h-9 sm:w-10 sm:h-10 text-sm font-bold shrink-0 ${member.unpaidCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}
                                        size="sm"
                                    />
                                    <div className="min-w-0">
                                        <h3 className="text-lg font-normal text-gray-900 group-hover:text-primary transition-colors truncate" style={{ fontFamily: SERIF }}>{member.name}</h3>
                                        <p className="text-xs sm:text-sm text-gray-500 truncate">{member.email}</p>
                                    </div>
                                </div>
                                <span className={`material-symbols-outlined text-gray-300 transition-transform duration-300 ${expandedMemberId === member.id ? 'rotate-180' : ''}`}>
                                    expand_more
                                </span>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end sm:gap-8">
                                <div className="rounded-lg border border-border-color bg-cream px-3 py-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:text-right sm:min-w-[90px]">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Saldo</p>
                                    <p className={`font-bold tabular-nums ${member.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`} style={{ fontFamily: SERIF }}>
                                        {formatCurrency(member.balance)}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border-color bg-cream px-3 py-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:text-right sm:min-w-[90px]">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ubetalte</p>
                                    <p className={`font-bold tabular-nums ${member.unpaidCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`} style={{ fontFamily: SERIF }}>
                                        {member.unpaidCount}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Expanded Details - Payment History */}
                        {expandedMemberId === member.id && (
                            <div className="border-t border-border-color bg-[#faf8f3] p-4 sm:p-6 animate-in slide-in-from-top-2 duration-200">
                                <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
                                    <span className="material-symbols-outlined text-primary text-lg">history</span>
                                    Betalingshistorikk
                                </h4>

                                {member.requests && member.requests.length > 0 ? (
                                    <div className="grid gap-2">
                                        {member.requests.map((req) => (
                                            <div key={req.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-white border border-border-color rounded-lg min-w-0">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-1 h-12 rounded-full ${req.status === 'PAID' ? 'bg-emerald-500' : (req.status === 'WAIVED' ? 'bg-gray-400' : 'bg-amber-400')}`}></div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-gray-900 text-sm truncate">{req.title}</p>
                                                        <p className="text-xs text-gray-500">{req.category === 'MEMBERSHIP_FEE' ? 'Medlemskontigent' : 'Faktura'}</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-6 w-full sm:w-auto min-w-0">
                                                    <div className="col-span-1 rounded-md bg-cream px-2.5 py-2 sm:rounded-none sm:bg-transparent sm:px-0 sm:py-0 flex items-center justify-between gap-3 sm:block sm:text-right min-w-0">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Beløp</p>
                                                        <p className="text-sm font-medium text-gray-900 tabular-nums truncate">{formatCurrency(req.amount)}</p>
                                                    </div>

                                                    <div className="col-span-1 rounded-md bg-cream px-2.5 py-2 sm:rounded-none sm:bg-transparent sm:px-0 sm:py-0 flex items-center justify-between gap-3 sm:block sm:text-right min-w-0 sm:min-w-[100px]">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Forfall</p>
                                                        <p className="text-sm text-gray-500 truncate">{formatDate(req.dueDate)}</p>
                                                    </div>

                                                    <div className="col-span-2 rounded-md bg-cream px-2.5 py-2 sm:rounded-none sm:bg-transparent sm:px-0 sm:py-0 text-left sm:text-right sm:min-w-[120px] flex items-center justify-between sm:justify-end gap-3 min-w-0">
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</p>
                                                            {req.status === 'PAID' ? (
                                                                <div className="flex items-center justify-start sm:justify-end gap-1 text-emerald-600 text-sm font-bold">
                                                                    <span className="material-symbols-outlined text-base">check_circle</span>
                                                                    <span>Betalt</span>
                                                                </div>
                                                            ) : req.status === 'WAIVED' ? (
                                                                <div className="flex items-center justify-start sm:justify-end gap-1 text-gray-500 text-sm font-bold">
                                                                    <span className="material-symbols-outlined text-base">remove_circle</span>
                                                                    <span>Fritatt</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center justify-start sm:justify-end gap-1 text-amber-500 text-sm font-bold">
                                                                    <span className="material-symbols-outlined text-base">pending</span>
                                                                    <span>Ubetalt</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {(req.status === 'PENDING') && (
                                                            <button
                                                                onClick={(e) => handleSingleReminder(member.id, req.id, e)}
                                                                disabled={emailSending}
                                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20 shrink-0"
                                                                title="Send påminnelse på e-post"
                                                            >
                                                                <span className="material-symbols-outlined text-lg">forward_to_inbox</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-400 text-sm italic rounded-xl border border-dashed border-border-color" style={{ fontFamily: SERIF }}>
                                        Ingen betalingskrav funnet for dette medlemmet.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {filteredMembers.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-2xl border border-border-color">
                        <div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <span className="material-symbols-outlined text-3xl">search_off</span>
                        </div>
                        <h3 className="text-lg font-normal text-gray-900 mb-1" style={{ fontFamily: SERIF }}>Ingen medlemmer funnet</h3>
                        <p className="text-gray-500 text-sm">Prøv et annet søkeord.</p>
                    </div>
                )}
            </div>

            <PremiumModal
                isOpen={modal.isOpen}
                title={modal.title}
                message={modal.message}
                type={modal.type}
                isConfirm={modal.isConfirm}
                onConfirm={modal.onConfirm}
                onCancel={closeModal}
                confirmText={modal.isConfirm ? "Gå videre" : "OK"}
            />
        </div>
    );
}
