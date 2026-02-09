import { ensureMember } from "@/server/auth/ensureMember";
import { getPaymentRequest } from "@/server/actions/payment-requests";
import { redirect } from "next/navigation";
import Link from "next/link";
import { RequestStatus } from "@prisma/client";
import PageTitleUpdater from "@/components/layout/PageTitleUpdater";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
    try {
        await ensureMember();
    } catch (e) {
        redirect("/sign-in");
    }

    const { id } = await params;
    const res = await getPaymentRequest(id);

    if (!res.success || !res.data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <div className="p-4 rounded-full bg-red-50 text-red-500">
                    <span className="material-symbols-outlined text-4xl">error</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900">Fant ikke faktura</h1>
                <p className="text-gray-500">{res.error || "Noe gikk galt."}</p>
                <Link href="/balance" className="btn-secondary">
                    Tilbake til oversikt
                </Link>
            </div>
        );
    }

    const invoice = res.data;
    const isPaid = invoice.status === RequestStatus.PAID;

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
            <PageTitleUpdater
                title={invoice.title}
                backHref="/balance"
                backLabel="Saldo & Økonomi"
            />

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Header Status Bar */}
                <div className={`px-6 py-4 border-b flex items-center justify-between ${isPaid ? "bg-emerald-50 border-emerald-100" : "bg-indigo-50 border-indigo-100"
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${isPaid ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-indigo-600"
                            }`}>
                            <span className="material-symbols-outlined text-xl">
                                {isPaid ? "verified" : "receipt_long"}
                            </span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">
                                {invoice.title}
                            </h1>
                            <p className="text-xs text-gray-500 font-medium">#{invoice.id.slice(-6).toUpperCase()}</p>
                        </div>
                    </div>

                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${isPaid
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : "bg-indigo-100 text-indigo-700 border-indigo-200"
                        }`}>
                        {isPaid ? "BETALT" : "UBETALT"}
                    </div>
                </div>

                {/* Main Content */}
                <div className="p-8 space-y-8">
                    {/* Amount Section */}
                    <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">Totalbeløp å betale</p>
                        <div className="flex items-center justify-center gap-2 text-4xl font-bold text-gray-900">
                            <span>{invoice.amount.toLocaleString("no-NO")}</span>
                            <span className="text-xl text-gray-400 font-medium">NOK</span>
                        </div>
                        {invoice.dueDate && (
                            <p className={`text-sm mt-3 font-medium ${!isPaid && new Date(invoice.dueDate) < new Date()
                                ? "text-red-600"
                                : "text-gray-500"
                                }`}>
                                Forfall: {new Date(invoice.dueDate).toLocaleDateString("no-NO", {
                                    day: 'numeric', month: 'long', year: 'numeric'
                                })}
                            </p>
                        )}
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Informasjon</h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Beskrivelse</p>
                                    <p className="text-sm font-medium text-gray-900">
                                        {invoice.description || "Ingen beskrivelse"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Utstedt dato</p>
                                    <p className="text-sm font-medium text-gray-900">
                                        {new Date(invoice.createdAt).toLocaleDateString("no-NO")}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Kategori</p>
                                    <p className="text-sm font-medium text-gray-900 capitalize">
                                        {invoice.category.toLowerCase().replace('_', ' ')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Betalingsinformasjon</h3>
                            <div className="bg-gray-50 p-4 rounded-xl space-y-3 text-sm border border-gray-100">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Konto.nr</span>
                                    <span className="font-mono font-bold text-gray-900">1229.02.11946</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">VIPPS</span>
                                    <span className="font-mono font-bold text-gray-900">+47 95180534 (Trym)</span>
                                </div>
                                <div className="border-t border-gray-200 pt-3 mt-2">
                                    <span className="text-gray-500 block text-xs uppercase tracking-wider mb-1">Melding</span>
                                    <span className="font-mono text-xs text-indigo-600 font-bold block bg-white px-3 py-2 rounded-lg border border-indigo-100 break-words">
                                        {invoice.member.lastName} - {invoice.title}
                                    </span>
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2 text-center">
                                * Vennligst merk betalingen med meldingen over.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center text-xs">
                    <span className="text-gray-400">
                        Har du spørsmål om denne fakturaen? Kontakt en i styret.
                    </span>
                    {isPaid && (
                        <div className="flex items-center gap-1.5 text-emerald-600 font-bold px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            Betalt {invoice.updatedAt.toLocaleDateString("no-NO")}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
