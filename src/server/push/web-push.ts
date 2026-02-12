import { createPrivateKey, sign } from "crypto";
import { db } from "@/server/db";

type PushConfig = {
    publicKey: string;
    privateKey: string;
    subject: string;
};

type PushResult = {
    success: boolean;
    status?: number;
    error?: string;
};

const DEFAULT_SUBJECT = "mailto:no-reply@stroen-sons.no";

const toBase64Url = (input: Buffer | string) => {
    const value = Buffer.isBuffer(input) ? input.toString("base64") : Buffer.from(input).toString("base64");
    return value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const fromBase64Url = (value: string) => {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    return Buffer.from(`${normalized}${padding}`, "base64");
};

const getPushConfig = (): PushConfig | null => {
    const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || DEFAULT_SUBJECT;

    if (!publicKey || !privateKey) return null;
    return { publicKey, privateKey, subject };
};

export const isPushConfigured = () => Boolean(getPushConfig());

const createVapidJwt = (audience: string, config: PushConfig) => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const header = { typ: "JWT", alg: "ES256" };
    const payload = {
        aud: audience,
        exp: nowSeconds + (12 * 60 * 60),
        sub: config.subject,
    };

    const unsignedToken = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(payload))}`;

    const publicKeyBytes = fromBase64Url(config.publicKey);
    const privateKeyBytes = fromBase64Url(config.privateKey);

    if (publicKeyBytes.length !== 65 || publicKeyBytes[0] !== 0x04) {
        throw new Error("Invalid VAPID public key format");
    }

    if (privateKeyBytes.length !== 32) {
        throw new Error("Invalid VAPID private key format");
    }

    const keyObject = createPrivateKey({
        key: {
            kty: "EC",
            crv: "P-256",
            x: toBase64Url(publicKeyBytes.subarray(1, 33)),
            y: toBase64Url(publicKeyBytes.subarray(33, 65)),
            d: toBase64Url(privateKeyBytes),
        },
        format: "jwk",
    });

    const signature = sign("sha256", Buffer.from(unsignedToken), {
        key: keyObject,
        dsaEncoding: "ieee-p1363",
    });

    return `${unsignedToken}.${toBase64Url(signature)}`;
};

const sendPushSignalToEndpoint = async (endpoint: string): Promise<PushResult> => {
    const config = getPushConfig();
    if (!config) {
        return { success: false, error: "Push not configured" };
    }

    try {
        const endpointUrl = new URL(endpoint);
        const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;
        const jwt = createVapidJwt(audience, config);

        const trySend = async (authorization: string) => {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    Authorization: authorization,
                    "Crypto-Key": `p256ecdsa=${config.publicKey}`,
                    TTL: "60",
                    Urgency: "high",
                    "Content-Length": "0",
                },
            });
            return response;
        };

        // RFC 8292 format
        let response = await trySend(`vapid t=${jwt}, k=${config.publicKey}`);

        // Compatibility fallback for some push services.
        if (!response.ok && [400, 401, 403].includes(response.status)) {
            response = await trySend(`WebPush ${jwt}`);
        }

        return {
            success: response.ok,
            status: response.status,
            error: response.ok ? undefined : await response.text(),
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown push error",
        };
    }
};

export async function sendPushSignalToMembers(memberIds: string[]) {
    const uniqueMemberIds = Array.from(new Set(memberIds.filter(Boolean)));
    if (uniqueMemberIds.length === 0) return { pushed: 0, removed: 0 };

    if (!isPushConfigured()) return { pushed: 0, removed: 0 };

    const subscriptions = await db.pushSubscription.findMany({
        where: { memberId: { in: uniqueMemberIds } },
        select: { id: true, endpoint: true },
    });

    if (subscriptions.length === 0) return { pushed: 0, removed: 0 };

    const staleIds: string[] = [];
    const successfulIds: string[] = [];

    await Promise.all(subscriptions.map(async (subscription) => {
        const result = await sendPushSignalToEndpoint(subscription.endpoint);
        if (result.success) {
            successfulIds.push(subscription.id);
            return;
        }

        if (!result.success) {
            const endpointHost = (() => {
                try {
                    return new URL(subscription.endpoint).host;
                } catch {
                    return "unknown-host";
                }
            })();
            console.warn("[push] Failed delivery", {
                host: endpointHost,
                status: result.status,
                error: result.error,
            });
        }

        if (result.status === 404 || result.status === 410) {
            staleIds.push(subscription.id);
        }
    }));

    if (staleIds.length > 0) {
        await db.pushSubscription.deleteMany({
            where: { id: { in: staleIds } },
        });
    }

    if (successfulIds.length > 0) {
        await db.pushSubscription.updateMany({
            where: { id: { in: successfulIds } },
            data: { lastUsedAt: new Date() },
        });
    }

    return { pushed: successfulIds.length, removed: staleIds.length };
}

export async function sendPushSignalToMember(memberId: string) {
    return sendPushSignalToMembers([memberId]);
}
