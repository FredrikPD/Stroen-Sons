import { getMyFinancialData } from "@/server/actions/finance";
import { MyInvoices } from "@/components/dashboard/MyInvoices";
import { BankInfoCard } from "@/components/dashboard/BankInfoCard";
import { UserTransactions } from "@/components/dashboard/UserTransactions";

export const dynamic = "force-dynamic";

import { ensureMember } from "@/server/auth/ensureMember";
import { redirect } from "next/navigation";

export default async function BalancePage() {
    try {
        await ensureMember();
    } catch (e) {
        redirect("/sign-in");
    }

    const data = await getMyFinancialData();

    // Sort transactions by date descending
    const sortedTransactions = data.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Mock ID if not available (should be available now)
    const memberId = data.memberId || "Ukjent";

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
            {/* Header Section */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">Saldo & Økonomi</h1>
                <p className="text-sm text-gray-500">Oversikt over din konto, fakturaer og betalingshistorikk.</p>
            </div>

            {/* Main Grid: Balance/Bank Card (Left) vs Invoices (Right) */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch">
                <div className="lg:w-1/3 flex flex-col gap-4">
                    {/* Balance Card */}
                    <div className="bg-[#0F172A] text-white p-6 rounded-xl shadow-md flex flex-col justify-between min-h-[180px] relative overflow-hidden group shrink-0">
                        {/* Background Icon */}
                        <div className="absolute top-4 right-4 text-white/5 pointer-events-none">
                            <span className="material-symbols-outlined text-[5rem]">account_balance_wallet</span>
                        </div>

                        <div className="relative z-10">
                            <h2 className="text-white/60 font-medium uppercase tracking-wider text-xs mb-1">Din Balanse</h2>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold tracking-tight">
                                    {data.balance.toLocaleString('no-NO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </span>
                                <span className="text-lg text-white/60">NOK</span>
                            </div>
                        </div>

                        <div className="relative z-10 mt-auto pt-4 border-t border-white/10">
                            <div className="flex items-center gap-2 text-xs text-white/50">
                                <span className="material-symbols-outlined text-[1.1em]">info</span>
                                <p>Saldo oppdateres automatisk.</p>
                            </div>
                        </div>
                    </div>

                    {/* Klubbens Konto Card */}
                    <BankInfoCard memberId={memberId} />
                </div>

                {/* Unpaid Invoices (Right - 2/3 width) */}
                <div className="lg:w-2/3 relative min-h-[400px] lg:min-h-0">
                    <div className="lg:absolute lg:inset-0">
                        <MyInvoices invoices={data.paymentRequests} className="h-full" />
                    </div>
                </div>
            </div>

            {/* Status / Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Paid This Year */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col justify-between h-[140px] relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-emerald-500 text-lg">arrow_upward</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Innbetalt i år</span>
                    </div>
                    <div>
                        <span className="text-3xl font-bold tracking-tight text-gray-900">
                            {Math.abs(data.transactions
                                .filter(t => t.amount > 0 && new Date(t.date).getFullYear() === new Date().getFullYear())
                                .reduce((acc, curr) => acc + curr.amount, 0)
                            ).toLocaleString('no-NO')}
                        </span>
                        <span className="text-lg text-gray-500"> NOK</span>
                    </div>
                    <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-10 transition-opacity">
                        <span className="material-symbols-outlined text-7xl text-emerald-500">payments</span>
                    </div>
                </div>

                {/* Expenses This Year */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col justify-between h-[140px] relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-red-500 text-lg">arrow_downward</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Utgifter i år</span>
                    </div>
                    <div>
                        <span className="text-3xl font-bold tracking-tight text-gray-900">
                            {Math.abs(data.transactions
                                .filter(t => t.amount < 0 && new Date(t.date).getFullYear() === new Date().getFullYear())
                                .reduce((acc, curr) => acc + curr.amount, 0)
                            ).toLocaleString('no-NO')}
                        </span>
                        <span className="text-lg text-gray-500"> NOK</span>
                    </div>
                    <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-10 transition-opacity">
                        <span className="material-symbols-outlined text-7xl text-red-500">trending_down</span>
                    </div>
                </div>

                {/* Total Invoice Amount */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col justify-between h-[140px] relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-indigo-500 text-lg">receipt_long</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ubetalt fakturaer</span>
                    </div>
                    <div>
                        <span className="text-3xl font-bold tracking-tight text-gray-900">
                            {data.paymentRequests.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('no-NO')}
                        </span>
                        <span className="text-lg text-gray-500"> NOK</span>
                    </div>
                    <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-10 transition-opacity">
                        <span className="material-symbols-outlined text-7xl text-indigo-500">account_balance_wallet</span>
                    </div>
                </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-4">
                <UserTransactions transactions={data.transactions.map(tx => ({
                    ...tx,
                    amount: Number(tx.amount)
                }))} />
            </div>
        </div>
    );
}
