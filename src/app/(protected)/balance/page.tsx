import { getMyFinancialData } from "@/server/actions/finance";
import { BalancePanelLayout } from "@/components/dashboard/BalancePanelLayout";
import { MyInvoices } from "@/components/dashboard/MyInvoices";
import { BankInfoCard } from "@/components/dashboard/BankInfoCard";
import { UserTransactions } from "@/components/dashboard/UserTransactions";
import { MonthlyFeePauseCard } from "@/components/dashboard/MonthlyFeePauseCard";
import { Metadata } from "next";
import { ensureMember } from "@/server/auth/ensureMember";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Saldo & Økonomi",
    description: "Oversikt over din konto, fakturaer og betalingshistorikk.",
};

export default async function BalancePage() {
    try {
        await ensureMember();
    } catch {
        redirect("/sign-in");
    }

    const data = await getMyFinancialData();

    const visibleInvoices = data.paymentRequests;

    const paidThisYear = Math.abs(
        data.transactions
            .filter(t => t.amount > 0 && new Date(t.date).getFullYear() === new Date().getFullYear())
            .reduce((acc, curr) => acc + curr.amount, 0)
    );
    const expensesThisYear = Math.abs(
        data.transactions
            .filter(t => t.amount < 0 && new Date(t.date).getFullYear() === new Date().getFullYear())
            .reduce((acc, curr) => acc + curr.amount, 0)
    );
    const unpaidTotal = data.paymentRequests
        .filter(req => req.status === 'PENDING')
        .reduce((acc, curr) => acc + curr.amount, 0);

    const fmt = (n: number) => n.toLocaleString('no-NO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    return (
        <div className="flex flex-col gap-8 min-w-0 overflow-x-hidden">

            {/* ── Page Header ─────────────────────────────────────────── */}
            <div className="flex items-end justify-between gap-4 pt-1">
                <div>
                    <h1
                        className="text-3xl sm:text-4xl font-normal text-gray-900 leading-none"
                        style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                    >
                        <em>Saldo & Økonomi</em>
                    </h1>
                    <div className="flex items-center gap-3 mt-3">
                        <div className="h-px w-8 bg-gray-300" />
                        <p className="text-[11px] text-gray-400 italic" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                            Konto, fakturaer og betalingshistorikk
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Balance + Invoices ───────────────────────────────────── */}
            <BalancePanelLayout
                left={
                    <div
                        className="rounded-2xl p-5 flex flex-col gap-5 relative overflow-hidden text-white"
                        style={{ background: "linear-gradient(180deg, #131313 0%, #0f0f0f 100%)", boxShadow: "0 4px 20px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)" }}
                    >
                        <div className="absolute top-4 right-4 text-white/[0.03] pointer-events-none">
                            <span className="material-symbols-outlined text-[6rem]">account_balance_wallet</span>
                        </div>

                        <div className="relative z-10">
                            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-gray-500 mb-2">Din balanse</p>
                            <div className="flex items-baseline gap-2">
                                <span
                                    className="text-4xl font-normal text-gray-100"
                                    style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                                >
                                    {fmt(data.balance)}
                                </span>
                                <span className="text-base text-gray-500">NOK</span>
                            </div>
                        </div>

                        <div className="h-px bg-white/8" />

                        <BankInfoCard mode="embedded" />

                        <div className="h-px bg-white/8" />

                        <MonthlyFeePauseCard
                            initialEnabled={data.monthlyFeePause.enabled}
                            balance={data.balance}
                            cap={data.monthlyFeePause.cap}
                            mode="embedded"
                        />
                    </div>
                }
                right={<MyInvoices invoices={visibleInvoices} limit={4} />}
            />

            {/* ── Stats ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100">
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400">Innbetalt i år</span>
                    </div>
                    <div className="px-4 py-3">
                        <span className="text-2xl font-normal text-gray-900" style={{ fontFamily: "'Georgia', serif" }}>
                            {fmt(paidThisYear)}
                        </span>
                        <span className="text-sm text-gray-400 ml-1">NOK</span>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100">
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400">Utgifter i år</span>
                    </div>
                    <div className="px-4 py-3">
                        <span className="text-2xl font-normal text-gray-900" style={{ fontFamily: "'Georgia', serif" }}>
                            {fmt(expensesThisYear)}
                        </span>
                        <span className="text-sm text-gray-400 ml-1">NOK</span>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100">
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400">Ubetalt fakturaer</span>
                    </div>
                    <div className="px-4 py-3">
                        <span className={`text-2xl font-normal ${unpaidTotal > 0 ? "text-amber-600" : "text-gray-900"}`} style={{ fontFamily: "'Georgia', serif" }}>
                            {fmt(unpaidTotal)}
                        </span>
                        <span className="text-sm text-gray-400 ml-1">NOK</span>
                    </div>
                </div>
            </div>

            {/* ── Transaction History ──────────────────────────────────── */}
            <div className="flex flex-col gap-0">
                <UserTransactions transactions={data.transactions.map(tx => ({
                    ...tx,
                    amount: Number(tx.amount)
                }))} />
            </div>
        </div>
    );
}
