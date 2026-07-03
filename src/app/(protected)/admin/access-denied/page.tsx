import Link from "next/link";
import { SERIF, btnPrimary } from "@/components/admin/ui";

export default function AccessDeniedPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
            <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-5xl">lock</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-normal text-gray-900 mb-2" style={{ fontFamily: SERIF }}>
                Ingen Tilgang
            </h1>
            <p className="text-gray-500 max-w-md mb-8">
                Du har ikke tilgang til denne siden. Hvis du mener dette er feil, vennligst kontakt en administrator.
            </p>
            <Link href="/dashboard" className={btnPrimary}>
                Gå til Dashboard
            </Link>
        </div>
    );
}
