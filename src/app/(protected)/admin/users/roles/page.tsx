import RolesManager from "@/components/admin/roles-manager";
import Link from "next/link";
import { SetHeader } from "@/components/layout/SetHeader";
import { ActionInfo } from "@/components/ui/ActionInfo";

export const metadata = {
    title: "Roller",
};

import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";

export default async function MemberRolesPage() {
    await ensureRole([Role.ADMIN]);
    return (
        <div className="space-y-6">
            <SetHeader backHref="/admin/users" backLabel="Brukere" />


            <div>
                <h1 className="text-3xl font-bold text-gray-900">Medlemsroller</h1>
                <p className="text-gray-500 mt-2">
                    Her kan du administrere roller og medlemstype for alle registrerte brukere.
                </p>
            </div>

            <ActionInfo
                variant="warning"
                title="Endringer lagres med en gang – ingen bekreftelse"
                items={[
                    "Rollen styrer hva medlemmet får tilgang til. Gir du noen «Admin», får de full tilgang, også til denne siden.",
                    "Rolleendringen synkes til innloggingen (Clerk). Hvis det feiler, er rollen likevel endret, og du får en varsel om det.",
                    "Medlemstypen bestemmer hvilken månedskontingent medlemmet faktureres. Den gjelder fremtidige fakturaer – fakturaer som allerede er laget, endres ikke.",
                ]}
            />

            <RolesManager />
        </div>
    );
}
