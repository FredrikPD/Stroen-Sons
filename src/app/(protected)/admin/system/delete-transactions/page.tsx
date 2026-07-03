import { ensureMember } from "@/server/auth/ensureMember";
import { redirect } from "next/navigation";
import { TransactionDeleter } from "@/components/admin/finance/TransactionDeleter";
import Link from "next/link";

export const metadata = {
    title: "Slett Transaksjoner",
};

import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";

export default async function TransactionDeletePage() {
    await ensureRole([Role.ADMIN]);

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
                        Sletting av en enkelttransaksjon kan ikke angres. Medlemmets saldo justeres tilbake, og hvis
                        transaksjonen var koblet til et betalingskrav settes kravet tilbake til «venter». Var det en
                        medlemskontingent, blir måneden markert som ubetalt igjen.
                    </p>
                    <p className="text-amber-800 text-xs mt-2">
                        <strong>Slett ALLE</strong> nullstiller hele økonomien: all transaksjonshistorikk slettes for godt,
                        alle saldoer settes til 0, alle betalingskrav settes tilbake til «venter», og ALLE betalinger
                        (også de som var registrert som betalt) markeres som ubetalt. Kan ikke angres — bruk kun ved full
                        nullstilling av systemet.
                    </p>
                </div>
            </div>

            <TransactionDeleter />
        </div>
    );
}
