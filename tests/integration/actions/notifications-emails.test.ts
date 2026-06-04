import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prismaMock } from "../../helpers/prisma";
import { makeNotification, dec } from "../../helpers/fixtures";
import { loginAsMember, logout } from "../../helpers/auth";

// ---------------------------------------------------------------------------
// Stable resend mock: a single emails.send / batch.send pair is reused across
// every `new Resend(...)` so we can assert on the calls regardless of where the
// singleton was constructed.
// ---------------------------------------------------------------------------
const { emailsSend, batchSend } = vi.hoisted(() => ({
    emailsSend: vi.fn(async () => ({ data: { id: "email_1" }, error: null })),
    batchSend: vi.fn(async () => ({ data: [], error: null })),
}));

vi.mock("resend", () => ({
    Resend: vi.fn(() => ({
        emails: { send: emailsSend, batch: { send: batchSend } },
        batch: { send: batchSend },
    })),
}));

import { revalidatePath } from "next/cache";
import {
    sendPushSignalToMember,
    sendPushSignalToMembers,
} from "@/server/push/web-push";

import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    createNotification,
    createManyNotifications,
    createNotificationsForMembers,
    broadcastNotification,
    notifyNewPhotos,
    sendInvoiceDeadlineReminders,
} from "@/server/actions/notifications";

import {
    sendPostNotification,
    sendPostUpdateNotification,
    sendEventNotification,
    sendEventUpdateNotification,
    sendPaymentReminder,
    sendBulkPaymentReminders,
} from "@/server/actions/emails";

const sendPushMemberMock = vi.mocked(sendPushSignalToMember);
const sendPushMembersMock = vi.mocked(sendPushSignalToMembers);
const revalidatePathMock = vi.mocked(revalidatePath);

beforeEach(() => {
    // The global web-push mock resolves { success: true, sent: 0 }. The notification
    // helpers read `.pushed`/`.removed`, so give them that shape here.
    sendPushMembersMock.mockResolvedValue({ pushed: 1, removed: 0 } as never);
    sendPushMemberMock.mockResolvedValue({ pushed: 1, removed: 0 } as never);
    emailsSend.mockReset();
    emailsSend.mockResolvedValue({ data: { id: "email_1" }, error: null });
    batchSend.mockReset();
    batchSend.mockResolvedValue({ data: [], error: null });
});

// ===========================================================================
// notifications.ts
// ===========================================================================

describe("notifications: getNotifications", () => {
    it("returns the member's 20 most-recent notifications and the unread count", async () => {
        loginAsMember({ id: "m_owner" });
        const notifs = [makeNotification({ id: "n1" }), makeNotification({ id: "n2" })];
        prismaMock.notification.findMany.mockResolvedValue(notifs as never);
        prismaMock.notification.count.mockResolvedValue(3 as never);

        const res = await getNotifications();

        expect(res).toEqual({ notifications: notifs, unreadCount: 3 });
        expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { memberId: "m_owner" },
                orderBy: { createdAt: "desc" },
                take: 20,
            })
        );
        expect(prismaMock.notification.count).toHaveBeenCalledWith(
            expect.objectContaining({ where: { memberId: "m_owner", read: false } })
        );
    });

    it("returns an empty, zero result when the caller is unauthenticated", async () => {
        logout();
        const res = await getNotifications();
        expect(res).toEqual({ notifications: [], unreadCount: 0 });
        expect(prismaMock.notification.findMany).not.toHaveBeenCalled();
    });

    it("swallows a query error and returns the safe empty result", async () => {
        loginAsMember({ id: "m_owner" });
        prismaMock.notification.findMany.mockRejectedValue(new Error("Unique constraint failed"));
        prismaMock.notification.count.mockResolvedValue(0 as never);
        const res = await getNotifications();
        expect(res).toEqual({ notifications: [], unreadCount: 0 });
    });
});

describe("notifications: markAsRead", () => {
    it("marks one notification read for the current member and revalidates the layout", async () => {
        loginAsMember({ id: "m_owner" });
        prismaMock.notification.update.mockResolvedValue(makeNotification({ read: true }) as never);

        await markAsRead("notif_42");

        expect(prismaMock.notification.update).toHaveBeenCalledWith({
            where: { id: "notif_42", memberId: "m_owner" },
            data: { read: true },
        });
        expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout");
    });

    it("does not throw and does not revalidate when the update fails", async () => {
        loginAsMember({ id: "m_owner" });
        prismaMock.notification.update.mockRejectedValue(new Error("Record not found"));

        await expect(markAsRead("missing")).resolves.toBeUndefined();
        expect(revalidatePathMock).not.toHaveBeenCalled();
    });

    it("does nothing when the caller is unauthenticated", async () => {
        logout();
        await expect(markAsRead("notif_42")).resolves.toBeUndefined();
        expect(prismaMock.notification.update).not.toHaveBeenCalled();
        expect(revalidatePathMock).not.toHaveBeenCalled();
    });
});

describe("notifications: markAllAsRead", () => {
    it("marks all unread notifications read for the current member and revalidates", async () => {
        loginAsMember({ id: "m_owner" });
        prismaMock.notification.updateMany.mockResolvedValue({ count: 5 } as never);

        await markAllAsRead();

        expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
            where: { memberId: "m_owner", read: false },
            data: { read: true },
        });
        expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout");
    });

    it("swallows errors from updateMany", async () => {
        loginAsMember({ id: "m_owner" });
        prismaMock.notification.updateMany.mockRejectedValue(new Error("boom"));
        await expect(markAllAsRead()).resolves.toBeUndefined();
        expect(revalidatePathMock).not.toHaveBeenCalled();
    });

    it("does nothing when the caller is unauthenticated", async () => {
        logout();
        await markAllAsRead();
        expect(prismaMock.notification.updateMany).not.toHaveBeenCalled();
    });
});

describe("notifications: createNotification", () => {
    it("persists the notification and fires a push signal to the member", async () => {
        prismaMock.notification.create.mockResolvedValue(makeNotification() as never);

        await createNotification({
            type: "POST_CREATED" as never,
            title: "Hei",
            message: "Et nytt innlegg",
            link: "/posts/1",
            memberId: "m_target",
        });

        expect(prismaMock.notification.create).toHaveBeenCalledWith({
            data: {
                type: "POST_CREATED",
                title: "Hei",
                message: "Et nytt innlegg",
                link: "/posts/1",
                memberId: "m_target",
            },
        });
        expect(sendPushMemberMock).toHaveBeenCalledWith("m_target");
    });

    it("never throws if the DB write fails — and does not attempt the push", async () => {
        prismaMock.notification.create.mockRejectedValue(new Error("db down"));

        await expect(
            createNotification({
                type: "POST_CREATED" as never,
                title: "x",
                message: "y",
                memberId: "m_target",
            })
        ).resolves.toBeUndefined();
        expect(sendPushMemberMock).not.toHaveBeenCalled();
    });
});

describe("notifications: createManyNotifications", () => {
    it("returns a zero result for an empty array without touching the DB", async () => {
        const res = await createManyNotifications([]);
        expect(res).toEqual({ created: 0, pushed: 0, removed: 0 });
        expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
        expect(sendPushMembersMock).not.toHaveBeenCalled();
    });

    it("filters out entries without a memberId; zero result if none remain", async () => {
        const res = await createManyNotifications([
            { type: "POST_CREATED" as never, title: "t", message: "m", memberId: "" },
        ]);
        expect(res).toEqual({ created: 0, pushed: 0, removed: 0 });
        expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
    });

    it("creates the normalized rows and pushes to the unique member ids", async () => {
        prismaMock.notification.createMany.mockResolvedValue({ count: 2 } as never);
        sendPushMembersMock.mockResolvedValue({ pushed: 2, removed: 1 } as never);

        const res = await createManyNotifications([
            { type: "POST_CREATED" as never, title: "t1", message: "m1", link: "/a", memberId: "m1" },
            { type: "POST_CREATED" as never, title: "t2", message: "m2", memberId: "m2" },
            { type: "POST_CREATED" as never, title: "t3", message: "m3", memberId: "m1" },
        ]);

        expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
            data: [
                { memberId: "m1", type: "POST_CREATED", title: "t1", message: "m1", link: "/a" },
                { memberId: "m2", type: "POST_CREATED", title: "t2", message: "m2", link: undefined },
                { memberId: "m1", type: "POST_CREATED", title: "t3", message: "m3", link: undefined },
            ],
        });
        // De-duplicated to two unique member ids.
        expect(sendPushMembersMock).toHaveBeenCalledWith(["m1", "m2"]);
        expect(res).toEqual({ created: 3, pushed: 2, removed: 1 });
    });

    it("returns a safe zero result if createMany throws", async () => {
        prismaMock.notification.createMany.mockRejectedValue(new Error("db"));
        const res = await createManyNotifications([
            { type: "POST_CREATED" as never, title: "t", message: "m", memberId: "m1" },
        ]);
        expect(res).toEqual({ created: 0, pushed: 0, removed: 0 });
    });
});

describe("notifications: createNotificationsForMembers", () => {
    it("returns zero for an empty (or all-falsy) member list", async () => {
        expect(await createNotificationsForMembers({
            type: "POST_CREATED" as never, title: "t", message: "m", memberIds: [],
        })).toEqual({ created: 0, pushed: 0, removed: 0 });

        expect(await createNotificationsForMembers({
            type: "POST_CREATED" as never, title: "t", message: "m", memberIds: ["", ""] as string[],
        })).toEqual({ created: 0, pushed: 0, removed: 0 });

        expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
    });

    it("dedupes the member ids, writes one row each, and pushes", async () => {
        prismaMock.notification.createMany.mockResolvedValue({ count: 2 } as never);
        sendPushMembersMock.mockResolvedValue({ pushed: 2, removed: 0 } as never);

        const res = await createNotificationsForMembers({
            type: "EVENT_CREATED" as never,
            title: "Arrangement",
            message: "Nytt arrangement",
            link: "/events/1",
            memberIds: ["a", "b", "a", ""],
        });

        expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
            data: [
                { memberId: "a", type: "EVENT_CREATED", title: "Arrangement", message: "Nytt arrangement", link: "/events/1" },
                { memberId: "b", type: "EVENT_CREATED", title: "Arrangement", message: "Nytt arrangement", link: "/events/1" },
            ],
        });
        expect(sendPushMembersMock).toHaveBeenCalledWith(["a", "b"]);
        expect(res).toEqual({ created: 2, pushed: 2, removed: 0 });
    });

    it("returns a safe zero result on DB error", async () => {
        prismaMock.notification.createMany.mockRejectedValue(new Error("db"));
        const res = await createNotificationsForMembers({
            type: "POST_CREATED" as never, title: "t", message: "m", memberIds: ["a"],
        });
        expect(res).toEqual({ created: 0, pushed: 0, removed: 0 });
    });
});

describe("notifications: broadcastNotification", () => {
    it("fans the notification out to every non-deleted member", async () => {
        prismaMock.member.findMany.mockResolvedValue([
            { id: "m1" }, { id: "m2" }, { id: "m3" },
        ] as never);
        prismaMock.notification.createMany.mockResolvedValue({ count: 3 } as never);
        sendPushMembersMock.mockResolvedValue({ pushed: 3, removed: 0 } as never);

        await broadcastNotification({
            type: "ANNOUNCEMENT" as never,
            title: "Viktig",
            message: "Til alle",
        });

        expect(prismaMock.member.findMany).toHaveBeenCalledWith({
            where: { deletedAt: null },
            select: { id: true },
        });
        expect(prismaMock.notification.createMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.arrayContaining([
                    expect.objectContaining({ memberId: "m1" }),
                    expect.objectContaining({ memberId: "m2" }),
                    expect.objectContaining({ memberId: "m3" }),
                ]),
            })
        );
        expect(sendPushMembersMock).toHaveBeenCalledWith(["m1", "m2", "m3"]);
    });

    it("writes nothing when there are no members", async () => {
        prismaMock.member.findMany.mockResolvedValue([] as never);
        await broadcastNotification({ type: "ANNOUNCEMENT" as never, title: "t", message: "m" });
        expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
    });

    it("swallows a member lookup failure", async () => {
        prismaMock.member.findMany.mockRejectedValue(new Error("db"));
        await expect(
            broadcastNotification({ type: "ANNOUNCEMENT" as never, title: "t", message: "m" })
        ).resolves.toBeUndefined();
    });
});

describe("notifications: notifyNewPhotos", () => {
    it("broadcasts a photos-uploaded notification linking to the gallery", async () => {
        prismaMock.event.findUnique.mockResolvedValue({ title: "Sommerfest" } as never);
        prismaMock.member.findMany.mockResolvedValue([{ id: "m1" }] as never);
        prismaMock.notification.createMany.mockResolvedValue({ count: 1 } as never);

        await notifyNewPhotos("event_77");

        expect(prismaMock.event.findUnique).toHaveBeenCalledWith({
            where: { id: "event_77" },
            select: { title: true },
        });
        expect(prismaMock.notification.createMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.arrayContaining([
                    expect.objectContaining({
                        memberId: "m1",
                        type: "PHOTOS_UPLOADED",
                        title: "Nye bilder",
                        message: "Nye bilder er lagt til i albumet: Sommerfest",
                        link: "/gallery/event_77",
                    }),
                ]),
            })
        );
    });

    it("does nothing when the event does not exist", async () => {
        prismaMock.event.findUnique.mockResolvedValue(null as never);
        await notifyNewPhotos("missing");
        expect(prismaMock.member.findMany).not.toHaveBeenCalled();
        expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
    });

    it("swallows an event lookup error", async () => {
        prismaMock.event.findUnique.mockRejectedValue(new Error("db"));
        await expect(notifyNewPhotos("x")).resolves.toBeUndefined();
    });
});

describe("notifications: sendInvoiceDeadlineReminders", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("creates de-duplicated reminders for invoices due today and in three days", async () => {
        // findMany order in source: [dueSoon, dueToday]
        prismaMock.paymentRequest.findMany
            .mockResolvedValueOnce([
                { id: "soon1", memberId: "m1", title: "Kontingent", dueDate: new Date("2026-06-18T00:00:00.000Z") },
            ] as never)
            .mockResolvedValueOnce([
                { id: "today1", memberId: "m2", title: "Cup", dueDate: new Date("2026-06-15T00:00:00.000Z") },
            ] as never);
        // No existing reminders -> both get created.
        prismaMock.notification.findMany.mockResolvedValue([] as never);
        prismaMock.notification.createMany.mockResolvedValue({ count: 2 } as never);
        sendPushMembersMock.mockResolvedValue({ pushed: 2, removed: 0 } as never);

        const res = await sendInvoiceDeadlineReminders();

        expect(res).toEqual({ success: true, dueSoonCount: 1, dueTodayCount: 1 });
        expect(prismaMock.notification.createMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.arrayContaining([
                    expect.objectContaining({
                        memberId: "m1",
                        type: "INVOICE_CREATED",
                        title: "Faktura forfaller snart",
                        link: "/invoices/soon1",
                    }),
                    expect.objectContaining({
                        memberId: "m2",
                        type: "INVOICE_CREATED",
                        title: "Faktura forfaller i dag",
                        link: "/invoices/today1",
                    }),
                ]),
            })
        );
    });

    it("skips reminders that were already sent today (idempotency)", async () => {
        prismaMock.paymentRequest.findMany
            .mockResolvedValueOnce([] as never)
            .mockResolvedValueOnce([
                { id: "today1", memberId: "m2", title: "Cup", dueDate: new Date("2026-06-15T00:00:00.000Z") },
            ] as never);
        // The "due today" reminder already exists -> nothing new to create.
        prismaMock.notification.findMany.mockResolvedValue([
            { memberId: "m2", title: "Faktura forfaller i dag", link: "/invoices/today1" },
        ] as never);

        const res = await sendInvoiceDeadlineReminders();

        expect(res).toEqual({ success: true, dueSoonCount: 0, dueTodayCount: 1 });
        // createManyNotifications is invoked with an empty array -> early-returns, no DB write.
        expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
    });

    it("does not query existing notifications when nothing is due", async () => {
        prismaMock.paymentRequest.findMany
            .mockResolvedValueOnce([] as never)
            .mockResolvedValueOnce([] as never);

        const res = await sendInvoiceDeadlineReminders();

        expect(res).toEqual({ success: true, dueSoonCount: 0, dueTodayCount: 0 });
        expect(prismaMock.notification.findMany).not.toHaveBeenCalled();
        expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
    });

    it("returns a failure result if the payment-request query throws", async () => {
        prismaMock.paymentRequest.findMany.mockRejectedValue(new Error("db"));
        const res = await sendInvoiceDeadlineReminders();
        expect(res).toEqual({ success: false, dueSoonCount: 0, dueTodayCount: 0 });
    });
});

// ===========================================================================
// emails.ts
// ===========================================================================

// The constant the source uses as both the sender and the visible `to` so that
// the real recipients (bcc) stay hidden from one another.
const FROM_EMAIL = "Strøen Søns <varsel@xn--strensns-74ad.no>";

describe("emails: sendPostNotification", () => {
    const ORIGINAL_ENV = process.env.RESEND_API_KEY;

    beforeEach(() => {
        process.env.RESEND_API_KEY = "re_test_key";
    });

    afterEach(() => {
        if (ORIGINAL_ENV === undefined) delete process.env.RESEND_API_KEY;
        else process.env.RESEND_API_KEY = ORIGINAL_ENV;
    });

    const params = {
        postTitle: "Stor nyhet",
        postContent: "# Overskrift\nFørste linje\nAndre linje",
        authorName: "Kari",
        postId: "post_9",
        category: "NYHET",
    };

    it("bcc-sends one email per chunk to active members and reports the count", async () => {
        prismaMock.member.findMany.mockResolvedValue([
            { email: "a@example.com" },
            { email: "b@example.com" },
        ] as never);

        const res = await sendPostNotification(params);

        expect(res).toEqual({ success: true, count: 2 });
        expect(prismaMock.member.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ status: "ACTIVE", deletedAt: null }),
                select: { email: true },
            })
        );
        expect(emailsSend).toHaveBeenCalledTimes(1);
        const payload = emailsSend.mock.calls[0][0] as Record<string, unknown>;
        expect(payload.subject).toBe("Nytt innlegg: Stor nyhet");
        // Privacy fix: the visible `to` is only the sender address — never the
        // recipient chunk — so members cannot see each other's emails.
        expect(payload.to).toEqual([FROM_EMAIL]);
        expect(payload.to).not.toEqual(["a@example.com", "b@example.com"]);
        // The real recipients are hidden in bcc.
        expect(payload.bcc).toEqual(["a@example.com", "b@example.com"]);
        expect(payload.from).toContain("Strøen Søns");
        expect(payload.from).toBe(FROM_EMAIL);
    });

    it("returns the missing-key result and sends nothing when RESEND_API_KEY is absent", async () => {
        delete process.env.RESEND_API_KEY;
        const res = await sendPostNotification(params);
        expect(res).toEqual({ success: false, error: "Missing API Key" });
        expect(prismaMock.member.findMany).not.toHaveBeenCalled();
        expect(emailsSend).not.toHaveBeenCalled();
    });

    it("returns count 0 and sends nothing when there are no active members", async () => {
        prismaMock.member.findMany.mockResolvedValue([] as never);
        const res = await sendPostNotification(params);
        expect(res).toEqual({ success: true, count: 0 });
        expect(emailsSend).not.toHaveBeenCalled();
    });

    it("splits more than 50 recipients into multiple chunked sends", async () => {
        const recipients = Array.from({ length: 120 }, (_, i) => ({ email: `u${i}@example.com` }));
        prismaMock.member.findMany.mockResolvedValue(recipients as never);

        const res = await sendPostNotification(params);

        expect(emailsSend).toHaveBeenCalledTimes(3); // 50 + 50 + 20
        expect(res).toEqual({ success: true, count: 120 });
    });

    it("does not count a chunk that Resend rejects with an error", async () => {
        prismaMock.member.findMany.mockResolvedValue([{ email: "a@example.com" }] as never);
        emailsSend.mockResolvedValueOnce({ data: null, error: { message: "blocked" } });

        const res = await sendPostNotification(params);
        expect(res).toEqual({ success: true, count: 0 });
    });

    it("returns a failure result if the member query throws", async () => {
        prismaMock.member.findMany.mockRejectedValue(new Error("db"));
        const res = await sendPostNotification(params);
        expect(res.success).toBe(false);
    });
});

describe("emails: sendPostUpdateNotification", () => {
    beforeEach(() => {
        process.env.RESEND_API_KEY = "re_test_key";
    });
    afterEach(() => {
        delete process.env.RESEND_API_KEY;
    });

    const params = {
        postTitle: "Endret",
        postContent: "Body",
        authorName: "Per",
        postId: "post_2",
        category: "NYHET",
    };

    it("sends an 'Oppdatert innlegg' subject to active members", async () => {
        prismaMock.member.findMany.mockResolvedValue([{ email: "x@example.com" }] as never);
        const res = await sendPostUpdateNotification(params);
        expect(res).toEqual({ success: true, count: 1 });
        const payload = emailsSend.mock.calls[0][0] as Record<string, unknown>;
        expect(payload.subject).toBe("Oppdatert innlegg: Endret");
        // Privacy fix: the visible `to` is only the sender address, never the
        // recipient chunk; the real recipient is hidden in bcc.
        expect(payload.to).toEqual([FROM_EMAIL]);
        expect(payload.to).not.toEqual(["x@example.com"]);
        expect(payload.bcc).toEqual(["x@example.com"]);
        expect(payload.from).toBe(FROM_EMAIL);
    });

    it("returns the missing-key result without RESEND_API_KEY", async () => {
        delete process.env.RESEND_API_KEY;
        const res = await sendPostUpdateNotification(params);
        expect(res).toEqual({ success: false, error: "Missing API Key" });
    });
});

describe("emails: sendEventNotification", () => {
    beforeEach(() => {
        process.env.RESEND_API_KEY = "re_test_key";
    });
    afterEach(() => {
        delete process.env.RESEND_API_KEY;
    });

    const params = {
        eventTitle: "Sommerfest",
        eventDescription: "## Velkommen\nDet blir gøy",
        eventDate: "2026-07-01",
        eventLocation: "Klubbhuset",
        eventId: "event_5",
    };

    it("bcc-sends to active members and reports the recipient count", async () => {
        prismaMock.member.findMany.mockResolvedValue([
            { email: "a@example.com" },
            { email: "b@example.com" },
        ] as never);

        const res = await sendEventNotification(params);

        expect(res).toEqual({ success: true, count: 2 });
        expect(emailsSend).toHaveBeenCalledTimes(1);
        const payload = emailsSend.mock.calls[0][0] as Record<string, unknown>;
        expect(payload.subject).toBe("Nytt arrangement: Sommerfest");
        expect(payload.bcc).toEqual(["a@example.com", "b@example.com"]);
        // Plain-text fallback is the cleaned first line of the description.
        // The strip regex removes "#" but not the following spaces, so "## Velkommen" -> " Velkommen".
        expect(payload.text).toBe(" Velkommen");
    });

    it("returns missing-key without RESEND_API_KEY", async () => {
        delete process.env.RESEND_API_KEY;
        const res = await sendEventNotification(params);
        expect(res).toEqual({ success: false, error: "Missing API Key" });
        expect(emailsSend).not.toHaveBeenCalled();
    });

    it("returns count 0 for no active members", async () => {
        prismaMock.member.findMany.mockResolvedValue([] as never);
        const res = await sendEventNotification(params);
        expect(res).toEqual({ success: true, count: 0 });
        expect(emailsSend).not.toHaveBeenCalled();
    });

    it("uses a default description label when none is supplied", async () => {
        prismaMock.member.findMany.mockResolvedValue([{ email: "a@example.com" }] as never);
        const res = await sendEventNotification({ ...params, eventDescription: "" });
        expect(res).toEqual({ success: true, count: 1 });
        const payload = emailsSend.mock.calls[0][0] as Record<string, unknown>;
        expect(payload.text).toBe("Ingen beskrivelse");
    });
});

describe("emails: sendEventUpdateNotification", () => {
    beforeEach(() => {
        process.env.RESEND_API_KEY = "re_test_key";
    });
    afterEach(() => {
        delete process.env.RESEND_API_KEY;
    });

    const params = {
        eventTitle: "Sommerfest",
        eventDescription: "Oppdatert info",
        eventDate: "2026-07-02",
        eventLocation: "Klubbhuset",
        eventId: "event_5",
    };

    it("sends an 'Oppdatert arrangement' subject to active members", async () => {
        prismaMock.member.findMany.mockResolvedValue([{ email: "a@example.com" }] as never);
        const res = await sendEventUpdateNotification(params);
        expect(res).toEqual({ success: true, count: 1 });
        const payload = emailsSend.mock.calls[0][0] as Record<string, unknown>;
        expect(payload.subject).toBe("Oppdatert arrangement: Sommerfest");
    });

    it("returns missing-key without RESEND_API_KEY", async () => {
        delete process.env.RESEND_API_KEY;
        const res = await sendEventUpdateNotification(params);
        expect(res).toEqual({ success: false, error: "Missing API Key" });
    });
});

describe("emails: sendPaymentReminder", () => {
    it("emails a single member about their unpaid invoices", async () => {
        prismaMock.member.findUnique.mockResolvedValue(
            { email: "owner@example.com", firstName: "Ola" } as never
        );
        prismaMock.paymentRequest.findMany.mockResolvedValue([
            { id: "inv1", title: "Kontingent", amount: dec(750), dueDate: new Date("2026-06-30T00:00:00.000Z") },
            { id: "inv2", title: "Cup", amount: dec(200), dueDate: null },
        ] as never);

        const res = await sendPaymentReminder("m_owner", ["inv1", "inv2"]);

        expect(res).toEqual({ success: true });
        expect(prismaMock.paymentRequest.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: { in: ["inv1", "inv2"] }, status: { not: "PAID" } },
            })
        );
        expect(emailsSend).toHaveBeenCalledTimes(1);
        const payload = emailsSend.mock.calls[0][0] as Record<string, unknown>;
        expect(payload.to).toBe("owner@example.com");
        expect(payload.subject).toBe("Betalingspåminnelse: 2 ubetalte fakturaer");
    });

    it("fails when the member is missing or has no email", async () => {
        prismaMock.member.findUnique.mockResolvedValue(null as never);
        const res = await sendPaymentReminder("missing", ["inv1"]);
        expect(res).toEqual({ success: false, error: "Member not found or missing email" });
        expect(emailsSend).not.toHaveBeenCalled();
    });

    it("fails when no unpaid invoices match the requested ids", async () => {
        prismaMock.member.findUnique.mockResolvedValue(
            { email: "owner@example.com", firstName: "Ola" } as never
        );
        prismaMock.paymentRequest.findMany.mockResolvedValue([] as never);
        const res = await sendPaymentReminder("m_owner", ["inv1"]);
        expect(res).toEqual({ success: false, error: "No unpaid invoices found for these IDs" });
        expect(emailsSend).not.toHaveBeenCalled();
    });

    it("returns a generic failure when Resend itself errors", async () => {
        prismaMock.member.findUnique.mockResolvedValue(
            { email: "owner@example.com", firstName: "Ola" } as never
        );
        prismaMock.paymentRequest.findMany.mockResolvedValue([
            { id: "inv1", title: "Kontingent", amount: dec(750), dueDate: null },
        ] as never);
        emailsSend.mockResolvedValueOnce({ data: null, error: { message: "rejected" } });

        const res = await sendPaymentReminder("m_owner", ["inv1"]);
        expect(res).toEqual({ success: false, error: "Failed to send email" });
    });
});

describe("emails: sendBulkPaymentReminders", () => {
    it("batches a reminder per member with pending invoices and counts them", async () => {
        prismaMock.member.findMany.mockResolvedValue([
            {
                id: "m1",
                email: "a@example.com",
                firstName: "Ola",
                paymentRequests: [
                    { id: "inv1", title: "Kontingent", amount: dec(750), dueDate: new Date("2026-06-30T00:00:00.000Z") },
                ],
            },
            {
                id: "m2",
                email: "b@example.com",
                firstName: "Kari",
                paymentRequests: [
                    { id: "inv2", title: "Cup", amount: dec(200), dueDate: null },
                ],
            },
        ] as never);

        const res = await sendBulkPaymentReminders();

        expect(res).toEqual({ success: true, count: 2 });
        expect(batchSend).toHaveBeenCalledTimes(1);
        const batchArg = batchSend.mock.calls[0][0] as Array<Record<string, unknown>>;
        expect(batchArg).toHaveLength(2);
        expect(batchArg[0].to).toBe("a@example.com");
        expect(batchArg[1].to).toBe("b@example.com");
    });

    it("returns count 0 (and an empty batch) when nobody has unpaid invoices", async () => {
        prismaMock.member.findMany.mockResolvedValue([] as never);
        const res = await sendBulkPaymentReminders();
        expect(res).toEqual({ success: true, count: 0 });
        // No members -> the loop never runs, so batch.send is not called.
        expect(batchSend).not.toHaveBeenCalled();
    });

    it("does not count a batch that Resend rejects", async () => {
        prismaMock.member.findMany.mockResolvedValue([
            {
                id: "m1",
                email: "a@example.com",
                firstName: "Ola",
                paymentRequests: [{ id: "inv1", title: "Kontingent", amount: dec(750), dueDate: null }],
            },
        ] as never);
        batchSend.mockResolvedValueOnce({ data: null, error: { message: "boom" } });

        const res = await sendBulkPaymentReminders();
        expect(res).toEqual({ success: true, count: 0 });
    });

    it("returns a failure result when the member query throws", async () => {
        prismaMock.member.findMany.mockRejectedValue(new Error("db"));
        const res = await sendBulkPaymentReminders();
        expect(res).toEqual({ success: false, error: "Failed to send bulk emails" });
    });
});
