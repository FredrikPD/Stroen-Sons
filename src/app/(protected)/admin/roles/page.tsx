import RolesManager from "@/components/admin/roles-manager";
import Link from "next/link";

export default function MemberRolesPage() {
    return (
        <div className="space-y-6">
            {/* Back Button */}
            <div>
                <Link
                    href="/admin"
                    className="inline-flex items-center text-gray-500 hover:text-gray-900 transition-colors font-medium text-sm"
                >
                    <span className="material-symbols-outlined mr-1 text-[1.2rem]">arrow_back</span>
                    Tilbake til oversikt
                </Link>
            </div>

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
