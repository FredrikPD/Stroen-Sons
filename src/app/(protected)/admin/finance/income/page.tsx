"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { Avatar } from "@/components/Avatar";
import { getMonthlyPaymentStatus, registerPayment, unregisterPayment } from "@/server/actions/finance";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Helper to get month name
const getMonthName = (monthIndex: number) => {
    const months = ["Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"];
    return months[monthIndex];
};

type PaymentStatus = "PAID" | "UNPAID" | "EXEMPT" | "PENDING";

type MemberPaymentData = {
    id: string;
    name: string;
    membershipType: string;
    avatarUrl?: string | null;
    history: {
        [period: string]: string;
    };
};

type FinanceStats = {
    totalCollected: number;
    expectedTotal: number;
    missing: number;
    paidCount: number;
    totalCount: number;
    percentage: number;
};

export default function IncomePage() {
    const { data: dashboardData, loading: dashboardLoading } = useAdminDashboard();
    const router = useRouter();

    // State for period selection
    const today = new Date();
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // 1-12

    // Data State
    const [members, setMembers] = useState<MemberPaymentData[]>([]);
    const [periods, setPeriods] = useState<string[]>([]);
    const [stats, setStats] = useState<FinanceStats | null>(null);
    const [loadingData, setLoadingData] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);

    // Fetch Data
    const fetchData = useCallback(async () => {
        setLoadingData(true);
        try {
            const data = await getMonthlyPaymentStatus(selectedYear, selectedMonth);
            setMembers(data.members);
            setPeriods(data.periods); // [current, prev, prevPrev]
            setStats(data.stats);
        } catch (error) {
            console.error("Failed to fetch payment data", error);
        } finally {
            setLoadingData(false);
        }
    }, [selectedYear, selectedMonth]);

    useEffect(() => {
        if (!dashboardLoading) {
            fetchData();
        }
    }, [fetchData, dashboardLoading]);


    const handleTogglePayment = async (memberId: string, period: string, currentStatus: string) => {
        setUpdating(memberId);
        try {
            if (currentStatus === 'PAID') {
                await unregisterPayment(memberId, period);
            } else {
                await registerPayment(memberId, period);
            }
            await fetchData(); // Refresh data to confirm and update stats
        } catch (error) {
            console.error("Failed to toggle payment", error);
            alert("Feil ved oppdatering av betaling");
        } finally {
            setUpdating(null);
        }
    };

    // Format period string for display (e.g. "2024-11" -> "November")
    const formatPeriodHeader = (period: string) => {
        if (!period) return "";
        const [y, m] = period.split('-');
        const monthName = getMonthName(parseInt(m) - 1);

        if (period === periods[0]) return `${monthName}`;
        return monthName;
    };

    // Generate period options (next 6 months + last 12 months)
    const periodOptions = [];
    // Start 6 months in the future
    for (let i = -6; i < 6; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        periodOptions.push({
            year: d.getFullYear(),
            month: d.getMonth() + 1,
            label: `${getMonthName(d.getMonth())} ${d.getFullYear()}`
        });
    }

    if (dashboardLoading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A1A1A]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Link href="/admin/finance" className="inline-flex items-center text-gray-500 hover:text-gray-900 transition-colors font-medium text-sm">
                <span className="material-symbols-outlined mr-1 text-[1.2rem]">arrow_back</span>
                Tilbake til oversikt
            </Link>

            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Månedskontingent</h1>
                    <p className="text-gray-500 text-sm max-w-3xl">
                        Oversikt over innbetalinger. Merk av betalt kontingent for aktive medlemmer.
                        Systemet bruker 'Sparse Data' for å holde databasen effektiv.
                    </p>
                </div>
            </div>

            {/* Stats & Overview Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Stats Card */}
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex flex-col h-full justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">PERIODE</p>
                            <div className="flex flex-col sm:flex-row justify-between items-end mb-6 gap-4">
                                <select
                                    value={`${selectedYear}-${selectedMonth}`}
                                    onChange={(e) => {
                                        const [y, m] = e.target.value.split('-');
                                        setSelectedYear(parseInt(y));
                                        setSelectedMonth(parseInt(m));
                                    }}
                                    className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
                                >
                                    {periodOptions.map(opt => (
                                        <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>

                                <div className="flex gap-8 w-full sm:w-auto justify-between sm:justify-end">
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 mb-1">Totalt innbetalt</p>
                                        <p className="text-xl font-bold text-gray-900">
                                            {stats ? `Kr ${stats.totalCollected.toLocaleString("nb-NO")},-` : '...'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 mb-1">Manglende</p>
                                        <p className="text-xl font-bold text-red-500">
                                            {stats ? `Kr ${stats.missing.toLocaleString("nb-NO")},-` : '...'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            {stats && (
                                <div className="relative pt-2">
                                    <div className="flex mb-2 items-center justify-between">
                                        <div>
                                            <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-50">
                                                Status
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-semibold inline-block text-indigo-600">
                                                {stats.percentage}% fullført
                                            </span>
                                        </div>
                                    </div>
                                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-100">
                                        <div style={{ width: `${stats.percentage}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 transition-all duration-500"></div>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-400">
                                        <span>{stats.paidCount} av {stats.totalCount} betalt</span>
                                        <span>{stats.percentage}% fullført</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Info Card */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-3 text-blue-800">
                        <span className="material-symbols-outlined">info</span>
                        <h3 className="font-bold text-sm">Hvordan fungerer dette?</h3>
                    </div>
                    <p className="text-xs text-blue-900/80 leading-relaxed mb-4">
                        Systemet genererer ikke lenger "Ubetalt" fakturaer for alle. I stedet markerer du bare de som har betalt.
                        Hvis en betaling er registrert, vises den som "Betalt". Hvis ikke, vises den som "Ubetalt".
                    </p>
                    <p className="text-xs text-blue-900/80 leading-relaxed font-semibold">
                        Klikk på "Ubetalt" knappen for å registrere en innbetaling.
                    </p>
                </div>
            </div>

            {/* Member List Table */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                {loadingData ? (
                    <div className="flex justify-center items-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A1A1A]"></div>
                    </div>
                ) : (
                    <>
                        {/* Table Header */}
                        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            <div className="col-span-4">Medlem</div>
                            <div className="col-span-2">MedlemsType</div>
                            {/* Reverse periods to show oldest first? No, newest first is usually better or standard reading order. Let's do PrevPrev, Prev, Current */}
                            <div className="col-span-2 text-center">{formatPeriodHeader(periods[2])}</div>
                            <div className="col-span-2 text-center">{formatPeriodHeader(periods[1])}</div>
                            <div className="col-span-2 text-center text-indigo-600">{formatPeriodHeader(periods[0])}</div>
                        </div>

                        {/* Table Body */}
                        <div className="divide-y divide-gray-100">
                            {members.map((member) => (
                                <div key={member.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50/50 transition-colors">
                                    {/* Member Info */}
                                    <div className="col-span-12 md:col-span-4 flex items-center gap-3">
                                        <div className="flex-shrink-0">
                                            <Avatar src={member.avatarUrl} initials={member.name.substring(0, 2).toUpperCase()} size="md" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{member.name}</p>
                                            <p className="text-xs text-gray-500">{member.membershipType}</p>
                                        </div>
                                    </div>

                                    {/* Type/Status column placeholder or actual status? Let's show Membership Type */}
                                    <div className="col-span-6 md:col-span-2 flex items-center">
                                        <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-md text-gray-600">
                                            {member.membershipType}
                                        </span>
                                    </div>

                                    {/* Past Months (Read Only usually, but let's make them read-only for simplicity or clickable?) 
                                        Let's keep them read-only visual indicators for history 
                                    */}
                                    {/* Period -2 */}
                                    <div className="hidden md:flex col-span-2 justify-center">
                                        {member.history[periods[2]] === "PAID" ? (
                                            <span className="material-symbols-outlined text-emerald-500 text-sm bg-emerald-50 rounded-full p-1">check</span>
                                        ) : (
                                            <span className="w-2 h-2 rounded-full bg-gray-200"></span>
                                        )}
                                    </div>

                                    {/* Period -1 */}
                                    <div className="hidden md:flex col-span-2 justify-center">
                                        {member.history[periods[1]] === "PAID" ? (
                                            <span className="material-symbols-outlined text-emerald-500 text-sm bg-emerald-50 rounded-full p-1">check</span>
                                        ) : (
                                            <span className="w-2 h-2 rounded-full bg-gray-200"></span>
                                        )}
                                    </div>

                                    {/* Current Period (Actionable) */}
                                    <div className="col-span-6 md:col-span-2 flex items-center justify-between md:justify-center gap-4">
                                        <button
                                            onClick={() => handleTogglePayment(member.id, periods[0], member.history[periods[0]])}
                                            disabled={updating === member.id}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${member.history[periods[0]] === "PAID" ? 'bg-emerald-500' : 'bg-gray-200'
                                                } ${updating === member.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <span className={`${member.history[periods[0]] === "PAID" ? 'translate-x-6' : 'translate-x-1'
                                                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                                        </button>

                                        <span className={`text-xs font-medium w-12 ${member.history[periods[0]] === "PAID" ? 'text-gray-900' : 'text-gray-500'
                                            }`}>
                                            {member.history[periods[0]] === "PAID" ? "Betalt" : "Ubetalt"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}





