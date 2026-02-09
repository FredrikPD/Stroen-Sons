
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
    } catch (e) {
        redirect("/sign-in");
    }

    const data = await getMyFinancialData();
    const invoices = data.paymentRequests;

    // Filter and Sort
    const unpaid = invoices
        .filter(inv => inv.status === RequestStatus.PENDING)
        .sort((a, b) => {
            // Overdue first (oldest due date first)
            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
            return dateA - dateB;
        });

    const paid = invoices
        .filter(inv => inv.status === RequestStatus.PAID)
        .sort((a, b) => {
            // Newest paid first (using updatedAt as proxy for payment time if paidAt not available on this type)
            const dateA = new Date(a.updatedAt).getTime();
            const dateB = new Date(b.updatedAt).getTime();
            return dateB - dateA;
        });

    const InvoiceItem = ({ invoice }: { invoice: typeof invoices[0] }) => {
        const isPaid = invoice.status === RequestStatus.PAID;
        const isOverdue = !isPaid && invoice.dueDate && new Date(invoice.dueDate) < new Date();
        const dueDateDisplay = invoice.dueDate
            ? new Date(invoice.dueDate).toLocaleDateString("no-NO")
            : "Ingen frist";

        return (
            <Link
                href={`/invoices/${invoice.id}`}
                className={`block border p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all group ${isPaid
                    ? "bg-gray-50/50 border-gray-100 hover:bg-gray-50 hover:border-gray-300"
                    : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-md"
                    }`}
            >
                <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isPaid ? "bg-emerald-100 text-emerald-600" : "bg-blue-50 text-blue-600"
                        }`}>
                        <span className="material-symbols-outlined">
                            {isPaid ? "check_circle" : "receipt_long"}
                        </span>
                    </div>
                    <div>
                        <h4 className={`font-bold ${isPaid ? "text-gray-700" : "text-gray-900 group-hover:text-blue-600"} transition-colors`}>
                            {invoice.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                            <span className="font-mono">#{invoice.id.slice(-6).toUpperCase()}</span>
                            {!isPaid && (
                                <span className={isOverdue ? "text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded" : ""}>
                                    Forfall: {dueDateDisplay}
                                </span>
                            )}
                            {isPaid && (
                                <span className="text-emerald-600 font-medium">
                                    Betalt {new Date(invoice.updatedAt).toLocaleDateString("no-NO")}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 pl-14 md:pl-0">
                    <span className={`text-lg font-bold whitespace-nowrap ${isPaid ? "text-gray-400" : "text-gray-900"}`}>
                        {invoice.amount.toLocaleString("no-NO")} kr
                    </span>
                    <span className="material-symbols-outlined text-gray-300 group-hover:text-blue-500 transition-colors">
                        chevron_right
                    </span>
                </div>
            </Link>
        );
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            <PageTitleUpdater title="Mine Fakturaer" backHref="/balance" backLabel="Saldo & Økonomi" />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Mine Fakturaer</h1>
                    <p className="text-gray-500">Oversikt over dine betalinger og krav.</p>
                </div>
            </div>

            {/* Ubetalte */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-gray-400">pending_actions</span>
                    <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide text-xs">Ubetalte Fakturaer</h2>
                    <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {unpaid.length}
                    </span>
                </div>

                {unpaid.length > 0 ? (
                    <div className="grid gap-3">
                        {unpaid.map(inv => (
                            <InvoiceItem key={inv.id} invoice={inv} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-8 text-center">
                        <p className="text-gray-500">Du har ingen ubetalte fakturaer. Godt jobba! 🎉</p>
                    </div>
                )}
            </section>

            {/* Betalte */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-gray-400">history</span>
                    <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide text-xs">Betalingshistorikk</h2>
                </div>

                {paid.length > 0 ? (
                    <div className="grid gap-3 opacity-80 hover:opacity-100 transition-opacity">
                        {paid.map(inv => (
                            <InvoiceItem key={inv.id} invoice={inv} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        Ingen betalingshistorikk enda.
                    </div>
                )}
            </section>
        </div>
    );
}
