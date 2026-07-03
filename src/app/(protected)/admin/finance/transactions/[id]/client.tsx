"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getTransactionDetails } from "@/server/actions/finance";
import { useRouter } from "next/navigation";
import { SetHeader } from "@/components/layout/SetHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { Avatar } from "@/components/Avatar";
import { SERIF, card, seeAllLink } from "@/components/admin/ui";

export default function TransactionDetailPage({ id }: { id: string }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchDetails = async () => {
            const res = await getTransactionDetails(id, "ADMIN");
            if (res.success) {
                setData(res.data);
            } else {
                setError(res.error || "Kunne ikke hente detaljer");
            }
            setLoading(false);
        };
        fetchDetails();
    }, [id]);

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto space-y-8">
                <SetHeader
                    backHref="/admin/finance/transactions"
                    backLabel="Transaksjonshistorikk"
                />
                <LoadingState className="min-h-[60vh] px-4" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-normal text-gray-900 mb-2" style={{ fontFamily: SERIF }}>Noe gikk galt</h2>
                <p className="text-gray-600 mb-6">{error || "Fant ikke transaksjonen"}</p>
                <Link href="/admin/finance/transactions" className={seeAllLink}>
                    &larr; Tilbake til oversikten
                </Link>
            </div>
        );
    }

    const { description, date, category, totalAmount, type, event, allocations, isSplit, createdAt, receiptUrl, receiptKey } = data;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("nb-NO", {
            style: "currency",
            currency: "NOK",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    // Derive a human-readable filename from receipt URL
    const getReceiptFileName = (url: string) => {
        try {
            const pathname = new URL(url).pathname;
            return decodeURIComponent(pathname.split("/").pop() || "Kvittering");
        } catch {
            return "Kvittering";
        }
    };

    // Determine if receipt is an image or PDF based on URL extension
    const isReceiptImage = (url: string) => {
        return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <SetHeader
                backHref="/admin/finance/transactions"
                backLabel="Transaksjonshistorikk"
            />

            {/* Header Card */}
            <div className={`${card} p-8`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-cream text-text-secondary border border-border-color uppercase tracking-wide">
                                {category}
                            </span>
                            <span className="text-sm text-gray-400">
                                {new Date(date).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                        <h1 className="text-3xl font-normal text-gray-900 mb-2" style={{ fontFamily: SERIF }}>{description}</h1>
                        <p className="text-gray-500 text-sm">
                            Registrert: {new Date(createdAt).toLocaleString('nb-NO')}
                        </p>
                    </div>

                    <div className="text-right">
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Totalbeløp</div>
                        <div className={`text-4xl font-normal tabular-nums ${type === 'INNTEKT' ? 'text-emerald-600' : 'text-gray-900'}`} style={{ fontFamily: SERIF }}>
                            {type === 'INNTEKT' ? '+' : ''}{formatCurrency(totalAmount)}
                        </div>
                    </div>
                </div>

                {event && (
                    <div className="mt-8 pt-6 border-t border-border-color">
                        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">Tilknyttet Arrangement</h3>
                        <Link href={`/events/${event.id}`} className="flex items-center gap-4 p-4 bg-cream rounded-xl hover:border-primary/50 border border-border-color transition-all group">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-primary border border-border-color group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined">event</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{event.title}</h4>
                                <span className="text-xs text-gray-500">Klikk for å se arrangement</span>
                            </div>
                            <span className="material-symbols-outlined ml-auto text-gray-400 group-hover:text-primary transition-colors">chevron_right</span>
                        </Link>
                    </div>
                )}
            </div>

            {/* Receipt / Kvittering */}
            {receiptUrl && (
                <div className={`${card} p-8`}>
                    <h2 className="text-lg font-normal text-gray-900 mb-4" style={{ fontFamily: SERIF }}>Kvittering</h2>

                    {/* Image preview for image receipts */}
                    {isReceiptImage(receiptUrl) && (
                        <div className="mb-4 rounded-xl overflow-hidden border border-border-color bg-cream">
                            <img
                                src={receiptUrl}
                                alt="Kvittering"
                                className="w-full max-h-[500px] object-contain"
                            />
                        </div>
                    )}

                    {/* Downloadable file card */}
                    <a
                        href={receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="flex items-center gap-3 p-3 bg-cream border border-border-color rounded-xl hover:border-primary/50 transition-colors group"
                    >
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-border-color text-primary group-hover:border-primary/40 transition-colors">
                            <span className="material-symbols-outlined">
                                {isReceiptImage(receiptUrl) ? "image" : "description"}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">
                                {getReceiptFileName(receiptUrl)}
                            </span>
                            <span className="text-xs text-gray-500">
                                Klikk for å laste ned
                            </span>
                        </div>
                        <span className="material-symbols-outlined text-gray-400 ml-auto group-hover:text-primary transition-colors">download</span>
                    </a>
                </div>
            )}

            {/* Allocations / Split Details */}
            <div className={`${card} overflow-hidden`}>
                <div className="px-8 py-6 border-b border-border-color flex justify-between items-center">
                    <h2 className="text-lg font-normal text-gray-900" style={{ fontFamily: SERIF }}>
                        {isSplit ? "Fordeling (Splittet)" : "Detaljer"}
                    </h2>
                    {isSplit && (
                        <span className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                            {allocations.length} {allocations.length === 1 ? 'person' : 'personer'} involvert
                        </span>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#faf8f3] text-gray-400 text-[11px] uppercase font-bold tracking-wider">
                            <tr>
                                <th className="px-8 py-4">Medlem / Beskrivelse</th>
                                <th className="px-8 py-4 text-right">Beløp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color">
                            {allocations.map((alloc: any) => (
                                <tr key={alloc.id} className="hover:bg-black/[0.02] transition-colors">
                                    <td className="px-8 py-4">
                                        {alloc.member ? (
                                            <div className="flex items-center gap-3">
                                                <Avatar
                                                    src={alloc.member.avatarUrl ?? null}
                                                    initials={alloc.member.name.substring(0, 2).toUpperCase()}
                                                    alt={alloc.member.name}
                                                    className="w-8 h-8 text-xs font-bold text-gray-600 bg-cream border border-border-color"
                                                    size="sm"
                                                />
                                                <div>
                                                    <div className="font-medium text-gray-900">{alloc.member.name}</div>
                                                    <div className="text-xs text-gray-500">{alloc.member.email}</div>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-500 italic">Ingen medlem tilknyttet (Felles)</span>
                                        )}
                                    </td>
                                    <td className={`px-8 py-4 text-right font-medium tabular-nums ${type === 'INNTEKT' ? 'text-emerald-600' : 'text-gray-900'}`}>
                                        {formatCurrency(alloc.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
