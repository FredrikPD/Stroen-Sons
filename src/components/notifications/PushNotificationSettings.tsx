"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4 || 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
};

export function PushNotificationSettings({ className = "" }: { className?: string }) {
    const [supported, setSupported] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [subscribed, setSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: "error" | "success" | "info"; text: string } | null>(null);

    const waitForServiceWorkerReady = async () => {
        const readyPromise = navigator.serviceWorker.ready;
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Service worker ready timed out")), 8000)
        );
        return Promise.race([readyPromise, timeoutPromise]);
    };

    const getOrRegisterServiceWorker = async () => {
        let registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
            registration = await navigator.serviceWorker.register("/sw.js");
        }
        return waitForServiceWorkerReady();
    };

    const syncSubscriptionToServer = async (subscription: PushSubscription | null) => {
        if (!subscription) return;

        const response = await fetch("/api/push/subscription", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ subscription: subscription.toJSON() }),
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload?.error || "Failed to save push subscription");
        }
    };

    const refreshState = async () => {
        if (!("window" in globalThis)) return;
        const hasSupport =
            window.isSecureContext &&
            "serviceWorker" in navigator &&
            "PushManager" in window &&
            "Notification" in window;

        setSupported(hasSupport);
        if (!hasSupport) return;

        setPermission(Notification.permission);

        const registration = await getOrRegisterServiceWorker();
        const existingSubscription = await registration.pushManager.getSubscription();
        setSubscribed(Boolean(existingSubscription));

        if (existingSubscription) {
            try {
                await syncSubscriptionToServer(existingSubscription);
            } catch {
                // Non-blocking best-effort sync.
            }
        }
    };

    useEffect(() => {
        refreshState().catch(() => undefined);
    }, []);

    const enablePush = async () => {
        if (!supported) return;
        setStatusMessage(null);

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
            toast.error("Push er ikke konfigurert enda (mangler VAPID-nøkkel).");
            setStatusMessage({ type: "error", text: "Push mangler VAPID-nøkkel i miljøvariabler." });
            return;
        }

        setLoading(true);
        try {
            let currentPermission = Notification.permission;
            if (currentPermission !== "granted") {
                currentPermission = await Notification.requestPermission();
                setPermission(currentPermission);
            }

            if (currentPermission !== "granted") {
                toast.error("Du må tillate varsler i nettleseren for å aktivere push.");
                setStatusMessage({ type: "error", text: "Tillat varsler i nettleseren for å aktivere push." });
                return;
            }

            const registration = await getOrRegisterServiceWorker();
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
                });
            }

            await syncSubscriptionToServer(subscription);
            setSubscribed(true);
            toast.success("Push-varsler er aktivert.");
            setStatusMessage({ type: "success", text: "Push-varsler er aktivert på denne enheten." });
        } catch (error) {
            console.error("Failed to enable push notifications:", error);
            toast.error("Kunne ikke aktivere push-varsler.");
            setStatusMessage({ type: "error", text: "Kunne ikke aktivere push-varsler. Sjekk nettlesertillatelse og prøv igjen." });
        } finally {
            setLoading(false);
        }
    };

    const disablePush = async () => {
        if (!supported) return;
        setLoading(true);
        setStatusMessage(null);

        try {
            const registration = await getOrRegisterServiceWorker();
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                const response = await fetch("/api/push/subscription", {
                    method: "DELETE",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ endpoint: subscription.endpoint }),
                });
                if (!response.ok) {
                    const payload = await response.json().catch(() => ({}));
                    throw new Error(payload?.error || "Failed to remove push subscription");
                }
                await subscription.unsubscribe();
            }

            setSubscribed(false);
            toast.success("Push-varsler er deaktivert.");
            setStatusMessage({ type: "info", text: "Push-varsler er deaktivert på denne enheten." });
        } catch (error) {
            console.error("Failed to disable push notifications:", error);
            toast.error("Kunne ikke deaktivere push-varsler.");
            setStatusMessage({ type: "error", text: "Kunne ikke deaktivere push-varsler. Prøv igjen." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`bg-white border border-gray-200 rounded-2xl p-8 shadow-sm ${className}`}>
            <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600">notifications_active</span>
                Push-varsler
            </h2>
            <p className="text-sm text-gray-600 mb-5">
                Få varsler om nye arrangementer, innlegg, fakturaer, frister, bilder og kontobevegelser.
            </p>

            {!supported ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <p className="font-semibold">Push-varsler støttes ikke i denne nettleseren/enheten.</p>
                    <p className="mt-2 text-xs text-amber-800">
                        På iPhone: åpne siden i Safari, trykk Del, velg "Legg til på Hjem-skjerm", og åpne appen fra hjemskjermen for å aktivere push-varsler.
                    </p>
                </div>
            ) : permission === "denied" ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                    Nettleseren blokkerer varsler. Tillat varsler i nettleserinnstillinger for å aktivere push.
                </div>
            ) : (
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold text-gray-900">
                            Status: {subscribed ? "Aktivert" : "Ikke aktivert"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            {subscribed ? "Du mottar varsler på denne enheten." : "Aktiver for å motta varsler på denne enheten."}
                        </p>
                    </div>
                    {subscribed ? (
                        <button
                            type="button"
                            onClick={disablePush}
                            disabled={loading}
                            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        >
                            {loading ? "Lagrer..." : "Deaktiver"}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={enablePush}
                            disabled={loading}
                            className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                            {loading ? "Aktiverer..." : "Aktiver"}
                        </button>
                    )}
                </div>
            )}

            {statusMessage && (
                <div
                    className={`mt-4 rounded-lg border px-3 py-2 text-xs ${statusMessage.type === "error"
                        ? "border-red-200 bg-red-50 text-red-800"
                        : statusMessage.type === "success"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-blue-200 bg-blue-50 text-blue-800"
                        }`}
                >
                    {statusMessage.text}
                </div>
            )}
        </div>
    );
}
