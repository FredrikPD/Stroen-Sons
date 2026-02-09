import RolesManager from "@/components/admin/roles-manager";
import Link from "next/link";

export const metadata = {
    title: "Roller",
};

export default function MemberRolesPage() {
    return (
        <div className="space-y-6">


            <div>
                <h1 className="text-3xl font-bold text-gray-900">Medlemsroller</h1>
                <p className="text-gray-500 mt-2">
                    Her kan du administrere roller (Administrator/Medlem) og medlemstype for alle registrerte brukere.
                </p>
            </div>

            <RolesManager />
        </div>
    );
}
