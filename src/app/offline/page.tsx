import Link from "next/link";

export const metadata = {
    title: "Offline",
};

export default function OfflinePage() {
    return (
        <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-6 shadow-sm text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-3xl">wifi_off</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Du er offline</h1>
                <p className="text-sm text-gray-600 mb-5">
                    Ingen internettforbindelse akkurat nå. Koble til nettverket og prøv igjen.
                </p>
                <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                >
                    Prøv igjen
                </Link>
            </div>
        </main>
    );
}
