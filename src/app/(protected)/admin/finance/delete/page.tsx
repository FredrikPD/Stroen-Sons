import { ensureMember } from "@/server/auth/ensureMember";
import { redirect } from "next/navigation";
import { TransactionDeleter } from "@/components/admin/finance/TransactionDeleter";
import Link from "next/link";

export const metadata = {
    title: "Slett Transaksjoner",
};

export default async function TransactionDeletePage() {
    try {
        const member = await ensureMember();
        if (member.role !== "ADMIN") {
            redirect("/dashboard");
        }
    } catch {
        redirect("/sign-in");
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Slett Transaksjoner</h1>
                    <p className="text-gray-500 text-sm">Søk opp og slett enkelttransaksjoner, eller nullstill hele systemet.</p>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-amber-600">warning</span>
                <div>
                    <h3 className="font-bold text-amber-900 text-sm">Advarsel</h3>
                    <p className="text-amber-800 text-xs mt-1">
                        Sletting av transaksjoner vil automatisk reversere saldo-endringen på det berørte medlemmet.
                        Sletting av <strong>ALLE</strong> transaksjoner vil sette alles saldo til 0.
                    </p>
                </div>
            </div>

            <TransactionDeleter />
        </div>
    );
}
