import Link from "next/link";

export default function AccessDeniedPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-5xl">lock</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Ingen Tilgang</h1>
            <p className="text-gray-500 max-w-md mb-8">
                Du har ikke tilgang til denne siden. Hvis du mener dette er feil, vennligst kontakt en administrator.
            </p>
            <Link
                href="/dashboard"
                className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-colors"
            >
                Gå til Dashboard
            </Link>
        </div>
    );
}
