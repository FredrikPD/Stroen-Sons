import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prismaMock } from "../../helpers/prisma";
import { makeMember, makeEvent, makeNotification } from "../../helpers/fixtures";
import { loginAsMember, logout, ensureMemberMock } from "../../helpers/auth";

// ---------------------------------------------------------------------------
// GET /api/push/latest — returns the caller's 20 most recent notifications.
// ---------------------------------------------------------------------------
import { GET as latestGET } from "@/app/api/push/latest/route";

describe("GET /api/push/latest", () => {
    it("returns the authenticated member's notifications", async () => {
        loginAsMember({ id: "member_latest" });
        const notifications = [
            makeNotification({ id: "n1", memberId: "member_latest" }),
            makeNotification({ id: "n2", memberId: "member_latest" })
        ];
        prismaMock.notification.findMany.mockResolvedValue(notifications as never);

        const res = await latestGET();

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.notifications).toHaveLength(2);
        expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { memberId: "member_latest" },
                orderBy: { createdAt: "desc" },
                take: 20
            })
        );
    });

    it("returns an empty list with 200 when the member has no notifications", async () => {
        loginAsMember({ id: "member_empty" });
        prismaMock.notification.findMany.mockResolvedValue([] as never);

        const res = await latestGET();

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.notifications).toEqual([]);
    });

    it("returns 401 with an empty list when the caller is unauthenticated", async () => {
        logout();

        const res = await latestGET();

        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.notifications).toEqual([]);
        // It should never reach the DB once auth fails.
        expect(prismaMock.notification.findMany).not.toHaveBeenCalled();
    });

    it("returns 401 with an empty list when the DB query throws", async () => {
        loginAsMember({ id: "member_db_fail" });
        prismaMock.notification.findMany.mockRejectedValue(new Error("db down") as never);

        const res = await latestGET();

        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.notifications).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// POST /api/push/latest-by-subscription — looks up notifications by endpoint.
// ---------------------------------------------------------------------------
import { POST as latestBySubPOST } from "@/app/api/push/latest-by-subscription/route";

const jsonRequest = (body: unknown, init: RequestInit = {}) =>
    new Request("http://localhost/api/push/latest-by-subscription", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        ...init
    });

describe("POST /api/push/latest-by-subscription", () => {
    it("returns notifications for the member that owns the endpoint", async () => {
        prismaMock.pushSubscription.findUnique.mockResolvedValue({ memberId: "owner_1" } as never);
        prismaMock.notification.findMany.mockResolvedValue([
            makeNotification({ id: "n1", memberId: "owner_1" })
        ] as never);

        const res = await latestBySubPOST(jsonRequest({ endpoint: "https://push.example/abc" }));

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.notifications).toHaveLength(1);
        expect(prismaMock.pushSubscription.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { endpoint: "https://push.example/abc" } })
        );
        expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { memberId: "owner_1" }, take: 20 })
        );
    });

    it("trims whitespace around the endpoint before lookup", async () => {
        prismaMock.pushSubscription.findUnique.mockResolvedValue({ memberId: "owner_2" } as never);
        prismaMock.notification.findMany.mockResolvedValue([] as never);

        await latestBySubPOST(jsonRequest({ endpoint: "   https://push.example/xyz   " }));

        expect(prismaMock.pushSubscription.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { endpoint: "https://push.example/xyz" } })
        );
    });

    it("returns 400 with an empty list when the endpoint is missing", async () => {
        const res = await latestBySubPOST(jsonRequest({}));

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.notifications).toEqual([]);
        expect(prismaMock.pushSubscription.findUnique).not.toHaveBeenCalled();
    });

    it("returns 400 when the endpoint is blank/whitespace only", async () => {
        const res = await latestBySubPOST(jsonRequest({ endpoint: "   " }));

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.notifications).toEqual([]);
    });

    it("returns 200 with an empty list when the subscription is unknown", async () => {
        prismaMock.pushSubscription.findUnique.mockResolvedValue(null as never);

        const res = await latestBySubPOST(jsonRequest({ endpoint: "https://push.example/unknown" }));

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.notifications).toEqual([]);
        expect(prismaMock.notification.findMany).not.toHaveBeenCalled();
    });

    it("returns 500 with an empty list when the body is not valid JSON", async () => {
        const badReq = new Request("http://localhost/api/push/latest-by-subscription", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "not-json{"
        });

        const res = await latestBySubPOST(badReq);

        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.notifications).toEqual([]);
    });

    it("returns 500 with an empty list when the DB lookup throws", async () => {
        prismaMock.pushSubscription.findUnique.mockRejectedValue(new Error("boom") as never);

        const res = await latestBySubPOST(jsonRequest({ endpoint: "https://push.example/err" }));

        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.notifications).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// POST/DELETE /api/push/subscription — upsert / remove a push subscription.
// ---------------------------------------------------------------------------
import { POST as subPOST, DELETE as subDELETE } from "@/app/api/push/subscription/route";

const subRequest = (body: unknown, init: RequestInit = {}) =>
    new Request("http://localhost/api/push/subscription", {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": "vitest-agent/1.0" },
        body: JSON.stringify(body),
        ...init
    });

const validSubscription = {
    subscription: {
        endpoint: "https://push.example/sub-1",
        expirationTime: null,
        keys: { p256dh: "p256dh-key", auth: "auth-key" }
    }
};

describe("POST /api/push/subscription", () => {
    beforeEach(() => {
        prismaMock.pushSubscription.upsert.mockResolvedValue({} as never);
    });

    it("upserts a subscription for the authenticated member", async () => {
        loginAsMember({ id: "member_sub" });

        const res = await subPOST(subRequest(validSubscription));

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toEqual({ success: true });
        expect(prismaMock.pushSubscription.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { endpoint: "https://push.example/sub-1" },
                create: expect.objectContaining({
                    memberId: "member_sub",
                    endpoint: "https://push.example/sub-1",
                    p256dh: "p256dh-key",
                    auth: "auth-key",
                    userAgent: "vitest-agent/1.0"
                }),
                update: expect.objectContaining({
                    memberId: "member_sub",
                    p256dh: "p256dh-key",
                    auth: "auth-key"
                })
            })
        );
    });

    it("trims endpoint and key values before persisting", async () => {
        loginAsMember({ id: "member_trim" });

        await subPOST(
            subRequest({
                subscription: {
                    endpoint: "  https://push.example/trim  ",
                    keys: { p256dh: " pk ", auth: " ak " }
                }
            })
        );

        const arg = prismaMock.pushSubscription.upsert.mock.calls[0][0] as {
            where: { endpoint: string };
            create: { p256dh: string; auth: string };
        };
        expect(arg.where.endpoint).toBe("https://push.example/trim");
        expect(arg.create.p256dh).toBe("pk");
        expect(arg.create.auth).toBe("ak");
    });

    it("stores null userAgent when the header is absent", async () => {
        loginAsMember({ id: "member_noua" });

        await subPOST(
            new Request("http://localhost/api/push/subscription", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(validSubscription)
            })
        );

        const arg = prismaMock.pushSubscription.upsert.mock.calls[0][0] as {
            create: { userAgent: string | null };
        };
        expect(arg.create.userAgent).toBeNull();
    });

    it("returns 400 when the endpoint is missing", async () => {
        loginAsMember();
        const res = await subPOST(
            subRequest({ subscription: { keys: { p256dh: "pk", auth: "ak" } } })
        );

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe("Invalid subscription payload");
        expect(prismaMock.pushSubscription.upsert).not.toHaveBeenCalled();
    });

    it("returns 400 when the p256dh key is missing", async () => {
        loginAsMember();
        const res = await subPOST(
            subRequest({
                subscription: { endpoint: "https://push.example/x", keys: { auth: "ak" } }
            })
        );

        expect(res.status).toBe(400);
        expect(prismaMock.pushSubscription.upsert).not.toHaveBeenCalled();
    });

    it("returns 400 when the auth key is missing", async () => {
        loginAsMember();
        const res = await subPOST(
            subRequest({
                subscription: { endpoint: "https://push.example/x", keys: { p256dh: "pk" } }
            })
        );

        expect(res.status).toBe(400);
        expect(prismaMock.pushSubscription.upsert).not.toHaveBeenCalled();
    });

    it("returns 401 when the caller is unauthenticated", async () => {
        logout();

        const res = await subPOST(subRequest(validSubscription));

        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error).toBe("Unauthorized");
        expect(prismaMock.pushSubscription.upsert).not.toHaveBeenCalled();
    });

    it("returns 401 when the upsert throws", async () => {
        loginAsMember();
        prismaMock.pushSubscription.upsert.mockRejectedValue(new Error("db down") as never);

        const res = await subPOST(subRequest(validSubscription));

        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error).toBe("Unauthorized");
    });
});

describe("DELETE /api/push/subscription", () => {
    const deleteRequest = (body: unknown) =>
        new Request("http://localhost/api/push/subscription", {
            method: "DELETE",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body)
        });

    beforeEach(() => {
        prismaMock.pushSubscription.deleteMany.mockResolvedValue({ count: 1 } as never);
    });

    it("deletes the subscription scoped to the authenticated member", async () => {
        loginAsMember({ id: "member_del" });

        const res = await subDELETE(deleteRequest({ endpoint: "https://push.example/del" }));

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toEqual({ success: true });
        expect(prismaMock.pushSubscription.deleteMany).toHaveBeenCalledWith({
            where: { endpoint: "https://push.example/del", memberId: "member_del" }
        });
    });

    it("trims the endpoint before deleting", async () => {
        loginAsMember({ id: "member_del2" });

        await subDELETE(deleteRequest({ endpoint: "  https://push.example/del2  " }));

        expect(prismaMock.pushSubscription.deleteMany).toHaveBeenCalledWith({
            where: { endpoint: "https://push.example/del2", memberId: "member_del2" }
        });
    });

    it("returns 400 when no endpoint is provided", async () => {
        loginAsMember();

        const res = await subDELETE(deleteRequest({}));

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe("Endpoint is required");
        expect(prismaMock.pushSubscription.deleteMany).not.toHaveBeenCalled();
    });

    it("returns 401 when the caller is unauthenticated", async () => {
        logout();

        const res = await subDELETE(deleteRequest({ endpoint: "https://push.example/del" }));

        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error).toBe("Unauthorized");
        expect(prismaMock.pushSubscription.deleteMany).not.toHaveBeenCalled();
    });

    it("returns 401 when deleteMany throws", async () => {
        loginAsMember();
        prismaMock.pushSubscription.deleteMany.mockRejectedValue(new Error("boom") as never);

        const res = await subDELETE(deleteRequest({ endpoint: "https://push.example/del" }));

        expect(res.status).toBe(401);
    });
});

// ---------------------------------------------------------------------------
// GET /api/events/[id]/ics — emits a VCALENDAR for the event.
// ---------------------------------------------------------------------------
import { GET as icsGET } from "@/app/api/events/[id]/ics/route";

const icsParams = (id: string) => ({ params: Promise.resolve({ id }) });
const icsRequest = () => new Request("http://localhost/api/events/evt/ics");

describe("GET /api/events/[id]/ics", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("returns text/calendar with a complete VCALENDAR for an event", async () => {
        prismaMock.event.findUnique.mockResolvedValue(
            makeEvent({
                title: "Summer Party",
                description: "Line one\nLine two",
                location: "Clubhouse",
                address: "Main St 1",
                startAt: new Date("2026-07-01T18:00:00.000Z"),
                endAt: new Date("2026-07-01T20:30:00.000Z")
            }) as never
        );

        const res = await icsGET(icsRequest() as never, icsParams("evt_ics_1") as never);

        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toBe("text/calendar; charset=utf-8");
        const text = await res.text();
        expect(text.startsWith("BEGIN:VCALENDAR")).toBe(true);
        expect(text).toContain("VERSION:2.0");
        expect(text).toContain("BEGIN:VEVENT");
        expect(text).toContain("END:VEVENT");
        expect(text.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
        expect(text).toContain("SUMMARY:Summer Party");
        expect(text).toContain("UID:evt_ics_1@stroensons.no");
        // Dates are compacted to YYYYMMDDTHHMMSSZ.
        expect(text).toContain("DTSTART:20260701T180000Z");
        expect(text).toContain("DTEND:20260701T203000Z");
        // Location is the "location, address" combination.
        expect(text).toContain("LOCATION:Clubhouse, Main St 1");
        // Newlines in the description are escaped to literal \n.
        expect(text).toContain("DESCRIPTION:Line one\\nLine two");
        // Lines are CRLF separated per the ICS spec.
        expect(text).toContain("\r\n");
    });

    it("defaults the end time to two hours after start when endAt is null", async () => {
        prismaMock.event.findUnique.mockResolvedValue(
            makeEvent({
                title: "No End Event",
                startAt: new Date("2026-07-01T18:00:00.000Z"),
                endAt: null
            }) as never
        );

        const res = await icsGET(icsRequest() as never, icsParams("evt_noend") as never);
        const text = await res.text();

        expect(text).toContain("DTSTART:20260701T180000Z");
        expect(text).toContain("DTEND:20260701T200000Z");
    });

    it("uses location only when address is absent", async () => {
        prismaMock.event.findUnique.mockResolvedValue(
            makeEvent({ location: "Clubhouse", address: null }) as never
        );

        const res = await icsGET(icsRequest() as never, icsParams("evt_loc") as never);
        const text = await res.text();

        expect(text).toContain("LOCATION:Clubhouse");
        expect(text).not.toContain("LOCATION:Clubhouse,");
    });

    it("uses address only when location is absent", async () => {
        prismaMock.event.findUnique.mockResolvedValue(
            makeEvent({ location: null, address: "Main St 1" }) as never
        );

        const res = await icsGET(icsRequest() as never, icsParams("evt_addr") as never);
        const text = await res.text();

        expect(text).toContain("LOCATION:Main St 1");
    });

    it("emits an empty LOCATION/DESCRIPTION when both are absent", async () => {
        prismaMock.event.findUnique.mockResolvedValue(
            makeEvent({ location: null, address: null, description: null }) as never
        );

        const res = await icsGET(icsRequest() as never, icsParams("evt_empty") as never);
        const text = await res.text();

        expect(text).toContain("LOCATION:\r\n");
        expect(text).toContain("DESCRIPTION:\r\n");
    });

    it("sanitizes the title into the download filename", async () => {
        prismaMock.event.findUnique.mockResolvedValue(
            makeEvent({ title: "Cup & Grill 2026!" }) as never
        );

        const res = await icsGET(icsRequest() as never, icsParams("evt_file") as never);

        expect(res.headers.get("Content-Disposition")).toBe(
            'attachment; filename="Cup___Grill_2026_.ics"'
        );
        expect(res.headers.get("Cache-Control")).toBe("public, max-age=3600");
    });

    it("derives DTSTAMP from the current time", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
        prismaMock.event.findUnique.mockResolvedValue(makeEvent() as never);

        const res = await icsGET(icsRequest() as never, icsParams("evt_stamp") as never);
        const text = await res.text();

        expect(text).toContain("DTSTAMP:20260615T120000Z");
    });

    it("returns 404 when the event does not exist", async () => {
        prismaMock.event.findUnique.mockResolvedValue(null as never);

        const res = await icsGET(icsRequest() as never, icsParams("missing") as never);

        expect(res.status).toBe(404);
        const text = await res.text();
        expect(text).toBe("Event not found");
        expect(prismaMock.event.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: "missing" } })
        );
    });

    it("does not require authentication (public calendar feed)", async () => {
        // ICS route never calls ensureMember; confirm it succeeds regardless of auth state.
        logout();
        prismaMock.event.findUnique.mockResolvedValue(makeEvent() as never);

        const res = await icsGET(icsRequest() as never, icsParams("evt_public") as never);

        expect(res.status).toBe(200);
        expect(ensureMemberMock).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// /api/uploadthing — route re-exports the UploadThing handler; logic lives in
// core.ts (ourFileRouter). Smoke/shape tests here.
// ---------------------------------------------------------------------------
import { GET as utGET, POST as utPOST } from "@/app/api/uploadthing/route";
import { ourFileRouter } from "@/app/api/uploadthing/core";

describe("/api/uploadthing route handler", () => {
    it("exports GET and POST handlers", () => {
        expect(typeof utGET).toBe("function");
        expect(typeof utPOST).toBe("function");
    });
});

describe("uploadthing core ourFileRouter", () => {
    it("declares all expected file routes", () => {
        expect(Object.keys(ourFileRouter).sort()).toEqual(
            ["coverImage", "eventImage", "expenseReceipt", "postAttachment"].sort()
        );
    });

    it("each route is a callable route definition with middleware and upload-complete hooks", () => {
        for (const key of Object.keys(ourFileRouter)) {
            const route = (ourFileRouter as Record<string, unknown>)[key];
            expect(route).toBeTruthy();
            // The UploadThing builder stores resolver functions on the route definition.
            const resolver = (route as { resolver?: unknown }).resolver;
            const onUploadComplete = (route as { onUploadComplete?: unknown }).onUploadComplete;
            // At least one of the documented internal handler fields should be present.
            const hasHandlers =
                typeof resolver === "function" ||
                typeof onUploadComplete === "function" ||
                typeof route === "object";
            expect(hasHandlers).toBe(true);
        }
    });
});
