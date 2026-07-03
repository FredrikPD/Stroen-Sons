"use client";

import React, { useState } from "react";
import PageTitleUpdater from "@/components/layout/PageTitleUpdater";
import { getFinancialReport, FinancialReportData } from "@/server/actions/reports";
import { toast } from "sonner"; // Assuming sonner is used based on package.json
import { SERIF, card, btnPrimary, label as labelClass, input } from "@/components/admin/ui";

export default function FinancialReportsPage() {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const [startDate, setStartDate] = useState(startOfYear.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState<FinancialReportData | null>(null);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const res = await getFinancialReport(new Date(startDate), new Date(endDate));
            if (res.success && res.data) {
                // @ts-ignore - casting for safety if server action return type mismatched in dev
                setReportData(res.data);
                toast.success(`Hentet rapport for ${res.data.rows.length} poster.`);
            } else {
                toast.error(res.error || "Kunne ikke hente rapport.");
            }
        } catch (error) {
            toast.error("En feil oppstod.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadCSV = () => {
        if (!reportData || reportData.rows.length === 0) return;

        const { members, rows: dataRows } = reportData;

        // CSV Header: Fixed Columns + All Member Names
        const fixedHeaders = ["Dato", "Beskrivelse", "Kategori", "Type", "Totalt Beløp"];
        const memberHeaders = members.map(m => `"${m.name.replace(/"/g, '""')}"`);
        const headers = [...fixedHeaders, ...memberHeaders];

        // CSV Rows
        const csvRows = dataRows.map(row => {
            const fixedCols = [
                new Date(row.date).toLocaleDateString("nb-NO"),
                `"${row.description.replace(/"/g, '""')}"`,
                row.category,
                row.type,
                row.totalAmount.toFixed(2).replace('.', ',')
            ];

            // Map each member's amount (or 0/empty)
            const memberCols = members.map(m => {
                const amount = row.memberAmounts[m.id];
                return amount ? amount.toFixed(2).replace('.', ',') : "";
            });

            return [...fixedCols, ...memberCols];
        });

        const csvContent = [
            headers.join(";"),
            ...csvRows.map(r => r.join(";"))
        ].join("\n");

        // Create Blob and Download
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Regnskap_Matrix_${startDate}_${endDate}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalIncome = reportData ? reportData.rows.filter(r => r.totalAmount > 0).reduce((sum, r) => sum + r.totalAmount, 0) : 0;
    const totalExpense = reportData ? reportData.rows.filter(r => r.totalAmount < 0).reduce((sum, r) => sum + r.totalAmount, 0) : 0;
    const netResult = totalIncome + totalExpense;

    return (
        <div className="space-y-6">
            <PageTitleUpdater title="Regnskap og Rapporter" backHref="/admin/finance" backLabel="Økonomi" />

            <div className={`${card} p-8`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-normal text-gray-900" style={{ fontFamily: SERIF }}>Generer Regnskap</h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Oversikt over alle inntekter og utgifter fordelt på medlemmer.
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-cream p-6 rounded-xl border border-border-color">
                    <div>
                        <label className={labelClass}>Fra Dato</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className={input}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Til Dato</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className={input}
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            className={`${btnPrimary} w-full h-11`}
                        >
                            {loading ? (
                                <>
                                    <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></span>
                                    Henter data...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-lg">list_alt</span>
                                    Generer Rapport
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Results Area */}
                {reportData && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                                <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-[0.15em] mb-1">Total Inntekt</p>
                                <p className="text-2xl font-normal text-emerald-700 tabular-nums" style={{ fontFamily: SERIF }}>
                                    {new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK" }).format(totalIncome)}
                                </p>
                            </div>
                            <div className="bg-red-50 border border-red-100 p-4 rounded-xl">
                                <p className="text-[11px] font-bold text-red-800 uppercase tracking-[0.15em] mb-1">Total Utgift</p>
                                <p className="text-2xl font-normal text-red-700 tabular-nums" style={{ fontFamily: SERIF }}>
                                    {new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK" }).format(Math.abs(totalExpense))}
                                </p>
                            </div>
                            <div className={`border p-4 rounded-xl ${netResult >= 0 ? 'bg-primary/10 border-primary/20' : 'bg-red-50 border-red-100'}`}>
                                <p className={`text-[11px] font-bold uppercase tracking-[0.15em] mb-1 ${netResult >= 0 ? 'text-primary' : 'text-red-800'}`}>Netto Resultat</p>
                                <p className={`text-2xl font-normal tabular-nums ${netResult >= 0 ? 'text-primary' : 'text-red-700'}`} style={{ fontFamily: SERIF }}>
                                    {new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK" }).format(netResult)}
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-normal text-gray-900" style={{ fontFamily: SERIF }}>Forhåndsvisning</h3>
                            <button
                                onClick={handleDownloadCSV}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2 text-sm"
                            >
                                <span className="material-symbols-outlined text-lg">download</span>
                                Last ned Excel (CSV)
                            </button>
                        </div>

                        <div className="border border-border-color rounded-xl overflow-hidden bg-white">
                            {/* Matrix Table with Horizontal Scroll */}
                            <div className="overflow-x-auto max-h-[600px]">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-[#faf8f3] border-b border-border-color sticky top-0 z-10">
                                        <tr>
                                            {/* Fixed Columns */}
                                            <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap bg-[#faf8f3] sticky left-0 z-20 border-r border-border-color w-[120px] min-w-[120px] max-w-[120px]">
                                                Dato
                                            </th>
                                            <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap bg-[#faf8f3] sticky left-[120px] z-20 border-r border-border-color w-[400px] min-w-[400px] max-w-[400px]">
                                                Beskrivelse
                                            </th>
                                            <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap border-r border-border-color min-w-[100px]">
                                                Totalt
                                            </th>

                                            {/* Dynamic Member Columns */}
                                            {reportData.members.map(member => (
                                                <th key={member.id} className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap border-r border-border-color min-w-[150px]">
                                                    {member.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-color">
                                        {reportData.rows.map((row) => (
                                            <tr key={row.id} className="hover:bg-black/[0.02]">
                                                {/* Fixed Cells */}
                                                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap bg-white sticky left-0 z-10 border-r border-border-color w-[120px] min-w-[120px] max-w-[120px] overflow-hidden text-ellipsis">
                                                    {new Date(row.date).toLocaleDateString("nb-NO")}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap bg-white sticky left-[120px] z-10 border-r border-border-color w-[300px] min-w-[300px] max-w-[300px] overflow-hidden text-ellipsis">
                                                    <div className="flex flex-col truncate">
                                                        <span className="truncate" title={row.description}>{row.description}</span>
                                                        <span className="text-[10px] text-gray-400 font-normal truncate">{row.category}</span>
                                                    </div>
                                                </td>
                                                <td className={`px-4 py-3 text-sm font-bold tabular-nums whitespace-nowrap border-r border-border-color min-w-[100px] ${row.totalAmount >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                                    {row.totalAmount.toLocaleString("nb-NO")}
                                                </td>

                                                {/* Dynamic Member Cells */}
                                                {reportData.members.map(member => {
                                                    const amount = row.memberAmounts[member.id];
                                                    return (
                                                        <td key={member.id} className="px-4 py-3 text-sm text-gray-600 border-r border-border-color text-right tabular-nums min-w-[150px]">
                                                            {amount ? (
                                                                <span className={amount >= 0 ? 'text-gray-900' : 'text-red-500'}>
                                                                    {amount.toLocaleString("nb-NO")}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-200">-</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                    {/* FOOTER: Totals */}
                                    <tfoot className="bg-[#faf8f3] border-t-2 border-border-color sticky bottom-0 z-20">
                                        <tr>
                                            <td className="px-4 py-4 text-sm font-bold text-gray-900 whitespace-nowrap bg-[#faf8f3] sticky left-0 z-30 border-r border-border-color w-[120px]">
                                                TOTALT
                                            </td>
                                            <td className="px-4 py-4 text-sm font-bold text-gray-500 whitespace-nowrap bg-[#faf8f3] sticky left-[120px] z-30 border-r border-border-color w-[300px]">
                                                {/* Filler */}
                                            </td>
                                            <td className={`px-4 py-4 text-sm font-black tabular-nums whitespace-nowrap border-r border-border-color min-w-[100px] ${netResult >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                                {netResult.toLocaleString("nb-NO")}
                                            </td>
                                            {reportData.members.map(member => {
                                                // Calculate total for this member column
                                                const memberTotal = reportData.rows.reduce((sum, row) => sum + (row.memberAmounts[member.id] || 0), 0);

                                                return (
                                                    <td key={member.id} className={`px-4 py-4 text-sm font-bold text-right tabular-nums border-r border-border-color min-w-[150px] ${memberTotal >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                                        {memberTotal.toLocaleString("nb-NO")}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
