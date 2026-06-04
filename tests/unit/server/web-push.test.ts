import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prismaMock } from "../../helpers/prisma";

// The real module is globally mocked in tests/setup.ts. We want the REAL implementation here.
vi.unmock("@/server/push/web-push");

// Valid VAPID test key pair (EC P-256): public is 65 bytes starting with 0x04, private is 32 bytes.
// Generated once with crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" }).
const VALID_PUBLIC_KEY = "BFWqwmAOIN136MvIzijFX6iqnEbgcr3uR9mynSzy67hAMwGn3_O6awfKT36v4VCsnOAMrDx1q7ipklpVpEJSEOU";
const VALID_PRIVATE_KEY = "1uNuJDmGn6hs_b9aMOkdTeUXaQ8VKhrT_NGda-M7PJE";

// Snapshot the env vars this module reads so we can restore them between tests.
const PUSH_ENV_KEYS = [
    "VAPID_PUBLIC_KEY",
    "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    "VAPID_PRIVATE_KEY",
    "VAPID_SUBJECT"
] as const;

const savedEnv: Record<string, string | undefined> = {};

function clearPushEnv() {
    for (const key of PUSH_ENV_KEYS) {
        delete process.env[key];
    }
}

function configurePushEnv(overrides: Partial<Record<(typeof PUSH_ENV_KEYS)[number], string>> = {}) {
    process.env.VAPID_PUBLIC_KEY = VALID_PUBLIC_KEY;
    process.env.VAPID_PRIVATE_KEY = VALID_PRIVATE_KEY;
    process.env.VAPID_SUBJECT = "mailto:test@stroen-sons.no";
    for (const [key, value] of Object.entries(overrides)) {
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }
}

/** Build a minimal Response-like object that mirrors what the module reads. */
function fakeResponse({ ok, status, body = "" }: { ok: boolean; status: number; body?: string }) {
    return {
        ok,
        status,
        text: vi.fn(async () => body)
    } as unknown as Response;
}

// Import the real implementation after vi.unmock so we bypass the global mock.
import {
    isPushConfigured,
    sendPushSignalToMember,
    sendPushSignalToMembers
} from "@/server/push/web-push";

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    // resetPrismaMock() already runs in the global beforeEach.
    clearPushEnv();
    fetchSpy = vi.spyOn(globalThis, "fetch");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
    for (const key of PUSH_ENV_KEYS) {
        if (savedEnv[key] === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = savedEnv[key];
        }
    }
    vi.restoreAllMocks();
    vi.useRealTimers();
});

// Capture the original env once so afterEach can restore the real process state.
for (const key of PUSH_ENV_KEYS) {
    savedEnv[key] = process.env[key];
}

describe("isPushConfigured", () => {
    it("returns false when no VAPID env vars are present", () => {
        clearPushEnv();
        expect(isPushConfigured()).toBe(false);
    });

    it("returns false when only the public key is set", () => {
        clearPushEnv();
        process.env.VAPID_PUBLIC_KEY = VALID_PUBLIC_KEY;
        expect(isPushConfigured()).toBe(false);
    });

    it("returns false when only the private key is set", () => {
        clearPushEnv();
        process.env.VAPID_PRIVATE_KEY = VALID_PRIVATE_KEY;
        expect(isPushConfigured()).toBe(false);
    });

    it("returns true when both public and private keys are set", () => {
        configurePushEnv();
        expect(isPushConfigured()).toBe(true);
    });

    it("accepts NEXT_PUBLIC_VAPID_PUBLIC_KEY as the public-key fallback", () => {
        clearPushEnv();
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = VALID_PUBLIC_KEY;
        process.env.VAPID_PRIVATE_KEY = VALID_PRIVATE_KEY;
        expect(isPushConfigured()).toBe(true);
    });

    it("prefers VAPID_PUBLIC_KEY over the NEXT_PUBLIC fallback (both present still configured)", () => {
        clearPushEnv();
        process.env.VAPID_PUBLIC_KEY = VALID_PUBLIC_KEY;
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "ignored";
        process.env.VAPID_PRIVATE_KEY = VALID_PRIVATE_KEY;
        expect(isPushConfigured()).toBe(true);
    });
});

describe("sendPushSignalToMembers — short-circuits without network", () => {
    it("returns {pushed:0,removed:0} for an empty member list and never fetches", async () => {
        configurePushEnv();
        const result = await sendPushSignalToMembers([]);
        expect(result).toEqual({ pushed: 0, removed: 0 });
        expect(fetchSpy).not.toHaveBeenCalled();
        expect(prismaMock.pushSubscription.findMany).not.toHaveBeenCalled();
    });

    it("returns {pushed:0,removed:0} when all member ids are falsy", async () => {
        configurePushEnv();
        const result = await sendPushSignalToMembers(["", undefined as unknown as string, null as unknown as string]);
        expect(result).toEqual({ pushed: 0, removed: 0 });
        expect(fetchSpy).not.toHaveBeenCalled();
        expect(prismaMock.pushSubscription.findMany).not.toHaveBeenCalled();
    });

    it("returns {pushed:0,removed:0} and skips the DB lookup when push is not configured", async () => {
        clearPushEnv();
        const result = await sendPushSignalToMembers(["member_1"]);
        expect(result).toEqual({ pushed: 0, removed: 0 });
        expect(prismaMock.pushSubscription.findMany).not.toHaveBeenCalled();
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("returns {pushed:0,removed:0} when the member has no stored subscriptions", async () => {
        configurePushEnv();
        prismaMock.pushSubscription.findMany.mockResolvedValue([] as never);
        const result = await sendPushSignalToMembers(["member_1"]);
        expect(result).toEqual({ pushed: 0, removed: 0 });
        expect(prismaMock.pushSubscription.findMany).toHaveBeenCalledTimes(1);
        expect(fetchSpy).not.toHaveBeenCalled();
        expect(prismaMock.pushSubscription.deleteMany).not.toHaveBeenCalled();
        expect(prismaMock.pushSubscription.updateMany).not.toHaveBeenCalled();
    });

    it("dedupes member ids before querying the database", async () => {
        configurePushEnv();
        prismaMock.pushSubscription.findMany.mockResolvedValue([] as never);
        await sendPushSignalToMembers(["member_1", "member_1", "member_2", ""]);
        expect(prismaMock.pushSubscription.findMany).toHaveBeenCalledWith({
            where: { memberId: { in: ["member_1", "member_2"] } },
            select: { id: true, endpoint: true }
        });
    });
});

describe("sendPushSignalToMembers — delivery", () => {
    beforeEach(() => {
        configurePushEnv();
    });

    it("POSTs to each subscription endpoint and reports the pushed count on success", async () => {
        prismaMock.pushSubscription.findMany.mockResolvedValue([
            { id: "sub_1", endpoint: "https://fcm.googleapis.com/send/aaa" },
            { id: "sub_2", endpoint: "https://updates.push.services.mozilla.com/wpush/v2/bbb" }
        ] as never);
        fetchSpy.mockResolvedValue(fakeResponse({ ok: true, status: 201 }));

        const result = await sendPushSignalToMembers(["member_1"]);

        expect(result).toEqual({ pushed: 2, removed: 0 });
        expect(fetchSpy).toHaveBeenCalledTimes(2);
        const calledEndpoints = fetchSpy.mock.calls.map((call) => call[0]);
        expect(calledEndpoints).toContain("https://fcm.googleapis.com/send/aaa");
        expect(calledEndpoints).toContain("https://updates.push.services.mozilla.com/wpush/v2/bbb");
    });

    it("sends a POST with VAPID Authorization, Crypto-Key, TTL and Urgency headers", async () => {
        prismaMock.pushSubscription.findMany.mockResolvedValue([
            { id: "sub_1", endpoint: "https://fcm.googleapis.com/send/aaa" }
        ] as never);
        fetchSpy.mockResolvedValue(fakeResponse({ ok: true, status: 201 }));

        await sendPushSignalToMembers(["member_1"]);

        const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
        expect(init.method).toBe("POST");
        const headers = init.headers as Record<string, string>;
        expect(headers.Authorization).toMatch(/^vapid t=.+, k=.+$/);
        expect(headers["Crypto-Key"]).toBe(`p256ecdsa=${VALID_PUBLIC_KEY}`);
        expect(headers.TTL).toBe("60");
        expect(headers.Urgency).toBe("high");
        expect(headers["Content-Length"]).toBe("0");
    });

    it("updates lastUsedAt for successful subscriptions and does not delete them", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
        prismaMock.pushSubscription.findMany.mockResolvedValue([
            { id: "sub_1", endpoint: "https://fcm.googleapis.com/send/aaa" }
        ] as never);
        fetchSpy.mockResolvedValue(fakeResponse({ ok: true, status: 200 }));

        await sendPushSignalToMembers(["member_1"]);

        expect(prismaMock.pushSubscription.updateMany).toHaveBeenCalledWith({
            where: { id: { in: ["sub_1"] } },
            data: { lastUsedAt: new Date("2026-06-15T12:00:00.000Z") }
        });
        expect(prismaMock.pushSubscription.deleteMany).not.toHaveBeenCalled();
    });

    it("deletes subscriptions that return 410 Gone", async () => {
        prismaMock.pushSubscription.findMany.mockResolvedValue([
            { id: "sub_gone", endpoint: "https://fcm.googleapis.com/send/gone" }
        ] as never);
        fetchSpy.mockResolvedValue(fakeResponse({ ok: false, status: 410, body: "gone" }));

        const result = await sendPushSignalToMembers(["member_1"]);

        expect(result).toEqual({ pushed: 0, removed: 1 });
        expect(prismaMock.pushSubscription.deleteMany).toHaveBeenCalledWith({
            where: { id: { in: ["sub_gone"] } }
        });
        expect(prismaMock.pushSubscription.updateMany).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalled();
    });

    it("deletes subscriptions that return 404 Not Found", async () => {
        prismaMock.pushSubscription.findMany.mockResolvedValue([
            { id: "sub_404", endpoint: "https://fcm.googleapis.com/send/missing" }
        ] as never);
        fetchSpy.mockResolvedValue(fakeResponse({ ok: false, status: 404, body: "not found" }));

        const result = await sendPushSignalToMembers(["member_1"]);

        expect(result).toEqual({ pushed: 0, removed: 1 });
        expect(prismaMock.pushSubscription.deleteMany).toHaveBeenCalledWith({
            where: { id: { in: ["sub_404"] } }
        });
    });

    it("logs but does not delete subscriptions on a non-gone failure (e.g. 500)", async () => {
        prismaMock.pushSubscription.findMany.mockResolvedValue([
            { id: "sub_err", endpoint: "https://fcm.googleapis.com/send/err" }
        ] as never);
        fetchSpy.mockResolvedValue(fakeResponse({ ok: false, status: 500, body: "server error" }));

        const result = await sendPushSignalToMembers(["member_1"]);

        expect(result).toEqual({ pushed: 0, removed: 0 });
        expect(prismaMock.pushSubscription.deleteMany).not.toHaveBeenCalled();
        expect(prismaMock.pushSubscription.updateMany).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalled();
    });

    it("retries with the WebPush authorization scheme on a 401, then succeeds", async () => {
        prismaMock.pushSubscription.findMany.mockResolvedValue([
            { id: "sub_1", endpoint: "https://fcm.googleapis.com/send/aaa" }
        ] as never);
        fetchSpy
            .mockResolvedValueOnce(fakeResponse({ ok: false, status: 401, body: "unauthorized" }))
            .mockResolvedValueOnce(fakeResponse({ ok: true, status: 201 }));

        const result = await sendPushSignalToMembers(["member_1"]);

        expect(result).toEqual({ pushed: 1, removed: 0 });
        expect(fetchSpy).toHaveBeenCalledTimes(2);
        const secondInit = fetchSpy.mock.calls[1][1] as RequestInit;
        const secondHeaders = secondInit.headers as Record<string, string>;
        expect(secondHeaders.Authorization).toMatch(/^WebPush .+/);
    });

    it("does not retry the fallback scheme for non-(400/401/403) failures", async () => {
        prismaMock.pushSubscription.findMany.mockResolvedValue([
            { id: "sub_1", endpoint: "https://fcm.googleapis.com/send/aaa" }
        ] as never);
        fetchSpy.mockResolvedValue(fakeResponse({ ok: false, status: 500, body: "boom" }));

        await sendPushSignalToMembers(["member_1"]);

        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("treats a thrown fetch (network error) as a failed delivery without deleting", async () => {
        prismaMock.pushSubscription.findMany.mockResolvedValue([
            { id: "sub_1", endpoint: "https://fcm.googleapis.com/send/aaa" }
        ] as never);
        fetchSpy.mockRejectedValue(new Error("network down"));

        const result = await sendPushSignalToMembers(["member_1"]);

        expect(result).toEqual({ pushed: 0, removed: 0 });
        expect(prismaMock.pushSubscription.deleteMany).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalled();
    });

    it("treats an unparseable endpoint URL as a failed delivery and never fetches it", async () => {
        prismaMock.pushSubscription.findMany.mockResolvedValue([
            { id: "sub_bad", endpoint: "not-a-valid-url" }
        ] as never);

        const result = await sendPushSignalToMembers(["member_1"]);

        expect(result).toEqual({ pushed: 0, removed: 0 });
        expect(fetchSpy).not.toHaveBeenCalled();
        expect(prismaMock.pushSubscription.deleteMany).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalled();
    });

    it("handles a mix of success and gone subscriptions in one batch", async () => {
        prismaMock.pushSubscription.findMany.mockResolvedValue([
            { id: "sub_ok", endpoint: "https://fcm.googleapis.com/send/ok" },
            { id: "sub_gone", endpoint: "https://fcm.googleapis.com/send/gone" }
        ] as never);
        fetchSpy.mockImplementation(async (url) => {
            if (String(url).endsWith("/gone")) {
                return fakeResponse({ ok: false, status: 410, body: "gone" });
            }
            return fakeResponse({ ok: true, status: 201 });
        });

        const result = await sendPushSignalToMembers(["member_1"]);

        expect(result).toEqual({ pushed: 1, removed: 1 });
        expect(prismaMock.pushSubscription.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: { in: ["sub_ok"] } } })
        );
        expect(prismaMock.pushSubscription.deleteMany).toHaveBeenCalledWith({
            where: { id: { in: ["sub_gone"] } }
        });
    });

    it("computes the JWT audience from the endpoint protocol and host (URL is parsed)", async () => {
        prismaMock.pushSubscription.findMany.mockResolvedValue([
            { id: "sub_1", endpoint: "https://push.example.com:8443/path/to/sub?token=xyz" }
        ] as never);
        fetchSpy.mockResolvedValue(fakeResponse({ ok: true, status: 201 }));

        const result = await sendPushSignalToMembers(["member_1"]);

        // Successful delivery proves the JWT (built from the audience) signed and the request fired.
        expect(result).toEqual({ pushed: 1, removed: 0 });
        expect(fetchSpy).toHaveBeenCalledWith(
            "https://push.example.com:8443/path/to/sub?token=xyz",
            expect.any(Object)
        );
    });
});

describe("sendPushSignalToMember (single-member convenience wrapper)", () => {
    it("returns {pushed:0,removed:0} when the member id is empty", async () => {
        configurePushEnv();
        const result = await sendPushSignalToMember("");
        expect(result).toEqual({ pushed: 0, removed: 0 });
        expect(prismaMock.pushSubscription.findMany).not.toHaveBeenCalled();
    });

    it("delegates to sendPushSignalToMembers for a single member and delivers", async () => {
        configurePushEnv();
        prismaMock.pushSubscription.findMany.mockResolvedValue([
            { id: "sub_1", endpoint: "https://fcm.googleapis.com/send/single" }
        ] as never);
        fetchSpy.mockResolvedValue(fakeResponse({ ok: true, status: 201 }));

        const result = await sendPushSignalToMember("member_42");

        expect(result).toEqual({ pushed: 1, removed: 0 });
        expect(prismaMock.pushSubscription.findMany).toHaveBeenCalledWith({
            where: { memberId: { in: ["member_42"] } },
            select: { id: true, endpoint: true }
        });
        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("returns {pushed:0,removed:0} when push is not configured", async () => {
        clearPushEnv();
        const result = await sendPushSignalToMember("member_42");
        expect(result).toEqual({ pushed: 0, removed: 0 });
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});
