
import { ensureMember } from "@/server/auth/ensureMember";
import { getMyFinancialData } from "@/server/actions/finance";
import { redirect } from "next/navigation";
import Link from "next/link";
import PageTitleUpdater from "@/components/layout/PageTitleUpdater";
import { RequestStatus } from "@prisma/client";

export const metadata = {
    title: "Mine Fakturaer",
};

export default async function AllInvoicesPage() {
    try {
        await ensureMember();
    } catch {
        redirect("/sign-in");
    }

    const data = await getMyFinancialData();
    const invoices = data.paymentRequests;

    const formatNok = (amount: number) =>
        new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(amount);

    const unpaid = invoices
        .filter(inv => inv.status === RequestStatus.PENDING)
        .sort((a, b) => {
            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
            return dateA - dateB;
        });

    const paid = invoices
        .filter(inv => inv.status === RequestStatus.PAID)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const paused = invoices
        .filter(inv => inv.status === RequestStatus.PAUSED);

    const unpaidTotal = unpaid.reduce((acc, inv) => acc + inv.amount, 0);

    const InvoiceItem = ({ invoice }: { invoice: typeof invoices[0] }) => {
        const isPaid = invoice.status === RequestStatus.PAID;
        const isPaused = invoice.status === RequestStatus.PAUSED;
        const isOverdue = !isPaid && !isPaused && invoice.dueDate && new Date(invoice.dueDate) < new Date();

        const accentColor = isPaid
            ? "#10b981"
            : isPaused
            ? "#9ca3af"
            : isOverdue
            ? "#ef4444"
            : "#d1d5db";

        const statusLabel = isPaid ? "Betalt" : isPaused ? "Satt på pause" : isOverdue ? "Forfalt" : "Ubetalt";
        const statusClasses = isPaid
            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
            : isPaused
            ? "bg-gray-50 text-gray-500 border-gray-200"
            : isOverdue
            ? "bg-red-50 text-red-600 border-red-100"
            : "bg-gray-50 text-gray-500 border-gray-200";

        const dueDateDisplay = invoice.dueDate
            ? new Date(invoice.dueDate).toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" })
            : null;

        return (
            <Link
                href={`/invoices/${invoice.id}`}
                className={`group block rounded-xl border overflow-hidden transition-all ${
                    isPaid || isPaused
                        ? "border-gray-100 hover:border-gray-200 opacity-60 hover:opacity-80"
                        : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                }`}
            >
                <div className="flex">
                    {/* Status accent stripe */}
                    <div className="w-1.5 shrink-0" style={{ backgroundColor: accentColor }} />

                    <div className="flex-1 min-w-0 px-4 py-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 group-hover:text-gray-600 transition-colors leading-snug">
                                    {invoice.title}
                                </p>
                                <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                                    #{invoice.id.slice(-6).toUpperCase()}
                                </p>
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0 ${statusClasses}`}>
                                {statusLabel}
                            </span>
                        </div>

                        <div className="flex items-end justify-between gap-2">
                            <div>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">
                                    {isPaid ? "Betalt" : "Forfall"}
                                </p>
                                <p className={`text-[11px] font-medium ${isOverdue ? "text-red-500" : "text-gray-500"}`}>
                                    {dueDateDisplay ?? "Ingen frist"}
                                </p>
                            </div>
                            <p
                                className={`text-lg font-normal leading-none ${
                                    isPaid ? "text-gray-400" : isOverdue ? "text-red-500" : "text-gray-900"
                                }`}
                                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                            >
                                {formatNok(invoice.amount)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center pr-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0">
                        <span className="material-symbols-outlined text-base">chevron_right</span>
                    </div>
                </div>
            </Link>
        );
    };

    return (
        <div className="flex flex-col gap-8 min-w-0 overflow-x-hidden pb-20">
            <PageTitleUpdater title="Mine Fakturaer" backHref="/balance" backLabel="Saldo & Økonomi" />

            {/* ── Page Header ─────────────────────────────────────────── */}
            <div className="flex items-end justify-between gap-4 pt-1">
                <div>
                    <h1
                        className="text-3xl sm:text-4xl font-normal text-gray-900 leading-none"
                        style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                    >
                        <em>Mine Fakturaer</em>
                    </h1>
                    <div className="flex items-center gap-3 mt-3">
                        <div className="h-px w-8 bg-gray-300" />
                        <p className="text-[11px] text-gray-400 italic" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                            Oversikt over dine betalinger og krav
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Stats ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100">
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Ubetalte</span>
                    </div>
                    <div className="px-4 py-3">
                        <span
                            className={`text-2xl font-normal ${unpaid.length > 0 ? "text-amber-600" : "text-gray-400"}`}
                            style={{ fontFamily: "'Georgia', serif" }}
                        >
                            {unpaid.length}
                        </span>
                        <span className="text-sm text-gray-400 ml-1">stk</span>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100">
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Utestående</span>
                    </div>
                    <div className="px-4 py-3">
                        <span
                            className={`text-2xl font-normal ${unpaidTotal > 0 ? "text-amber-600" : "text-gray-400"}`}
                            style={{ fontFamily: "'Georgia', serif" }}
                        >
                            {unpaidTotal.toLocaleString("nb-NO", { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-sm text-gray-400 ml-1">NOK</span>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100">
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Betalte</span>
                    </div>
                    <div className="px-4 py-3">
                        <span
                            className="text-2xl font-normal text-emerald-600"
                            style={{ fontFamily: "'Georgia', serif" }}
                        >
                            {paid.length}
                        </span>
                        <span className="text-sm text-gray-400 ml-1">stk</span>
                    </div>
                </div>
            </div>

            {/* ── Ubetalte Fakturaer ───────────────────────────────────── */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Ubetalte Fakturaer</span>
                    {unpaid.length > 0 && (
                        <span className="text-[9px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                            {unpaid.length} ubetalt{unpaid.length !== 1 ? "e" : ""}
                        </span>
                    )}
                    <div className="flex-1 h-px bg-gray-100" />
                </div>

                {unpaid.length > 0 ? (
                    <div className="flex flex-col gap-2">
                        {unpaid.map(inv => (
                            <InvoiceItem key={inv.id} invoice={inv} />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-8 text-center">
                        <p className="text-sm text-gray-400 italic" style={{ fontFamily: "'Georgia', serif" }}>
                            Ingen ubetalte fakturaer. Godt jobba!
                        </p>
                    </div>
                )}
            </div>

            {/* ── Paused ──────────────────────────────────────────────── */}
            {paused.length > 0 && (
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Satt på Pause</span>
                        <div className="flex-1 h-px bg-gray-100" />
                    </div>
                    <div className="flex flex-col gap-2">
                        {paused.map(inv => (
                            <InvoiceItem key={inv.id} invoice={inv} />
                        ))}
                    </div>
                </div>
            )}

            {/* ── Betalingshistorikk ───────────────────────────────────── */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Betalingshistorikk</span>
                    <div className="flex-1 h-px bg-gray-100" />
                </div>

                {paid.length > 0 ? (
                    <div className="flex flex-col gap-2">
                        {paid.map(inv => (
                            <InvoiceItem key={inv.id} invoice={inv} />
                        ))}
                    </div>
                ) : (
                    <div className="py-6 text-center">
                        <p className="text-sm text-gray-400 italic" style={{ fontFamily: "'Georgia', serif" }}>
                            Ingen betalingshistorikk enda.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
