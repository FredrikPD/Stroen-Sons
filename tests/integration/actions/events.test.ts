import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prismaMock } from "../../helpers/prisma";
import { makeMember, makeAdmin, makeEvent, makePaymentRequest } from "../../helpers/fixtures";
import { logout, setClerkUser } from "../../helpers/auth";
import { revalidatePath } from "next/cache";

// events.ts depends on these — mock as async fns. Notifications are also globally exercised
// elsewhere; here we only assert they were invoked. emails.ts is mocked to async no-ops.
vi.mock("@/server/actions/notifications", () => ({
    createNotification: vi.fn(async () => undefined),
    createManyNotifications: vi.fn(async () => undefined),
    createNotificationsForMembers: vi.fn(async () => undefined),
    broadcastNotification: vi.fn(async () => undefined),
    notifyNewPhotos: vi.fn(async () => undefined),
    sendInvoiceDeadlineReminders: vi.fn(async () => undefined)
}));

vi.mock("@/server/actions/emails", () => ({
    sendEventNotification: vi.fn(async () => ({ success: true })),
    sendEventUpdateNotification: vi.fn(async () => ({ success: true })),
    sendPostNotification: vi.fn(async () => ({ success: true })),
    sendPostUpdateNotification: vi.fn(async () => ({ success: true })),
    sendPaymentReminder: vi.fn(async () => ({ success: true })),
    sendBulkPaymentReminders: vi.fn(async () => ({ success: true }))
}));

import {
    createEvent,
    updateEvent,
    deleteEvent,
    getUpcomingEvents
} from "@/server/actions/events";
import {
    getEventParticipants,
    getAllEventsForParticipation,
    adminAddParticipant,
    adminRemoveParticipant
} from "@/server/actions/event-participation";
import { getMyEvents } from "@/server/actions/my-events";
import { broadcastNotification } from "@/server/actions/notifications";
import { sendEventNotification, sendEventUpdateNotification } from "@/server/actions/emails";

/** A valid `eventSchema` input — coverImage and title are required by the real zod schema. */
function validEventInput(overrides: Record<string, unknown> = {}) {
    return {
        title: "Sommerfest",
        description: "Den store festen",
        startAt: new Date("2026-07-01T18:00:00.000Z"),
        coverImage: "https://img.example/cover.png",
        location: "Klubbhuset",
        category: "SOCIAL",
        ...overrides
    };
}

describe("createEvent", () => {
    beforeEach(() => {
        setClerkUser("clerk_admin");
        prismaMock.member.findUnique.mockResolvedValue(makeAdmin({ id: "admin_1" }) as never);
        prismaMock.event.create.mockResolvedValue(makeEvent({ id: "event_new" }) as never);
    });

    it("rejects an unauthenticated caller", async () => {
        logout();
        const res = await createEvent(validEventInput());
        expect(res).toEqual({ success: false, error: "Ikke autentisert" });
        expect(prismaMock.event.create).not.toHaveBeenCalled();
    });

    it("rejects a member without admin/moderator role", async () => {
        prismaMock.member.findUnique.mockResolvedValue(makeMember({ role: "MEMBER" }) as never);
        const res = await createEvent(validEventInput());
        expect(res.success).toBe(false);
        expect(res.error).toContain("tilgang");
        expect(prismaMock.event.create).not.toHaveBeenCalled();
    });

    it("rejects when no member record exists for the clerk user", async () => {
        prismaMock.member.findUnique.mockResolvedValue(null as never);
        const res = await createEvent(validEventInput());
        expect(res.success).toBe(false);
        expect(prismaMock.event.create).not.toHaveBeenCalled();
    });

    it("allows a MODERATOR to create events", async () => {
        prismaMock.member.findUnique.mockResolvedValue(makeMember({ id: "mod_1", role: "MODERATOR" }) as never);
        const res = await createEvent(validEventInput());
        expect(res).toEqual({ success: true });
        expect(prismaMock.event.create).toHaveBeenCalledTimes(1);
    });

    it("returns a validation error when title is missing", async () => {
        const res = await createEvent(validEventInput({ title: "" }));
        expect(res.success).toBe(false);
        expect(res.error).toBe("Ugyldig data");
        expect(res).toHaveProperty("details");
        expect(prismaMock.event.create).not.toHaveBeenCalled();
    });

    it("returns a validation error when the required coverImage is missing", async () => {
        const input = validEventInput();
        delete (input as Record<string, unknown>).coverImage;
        const res = await createEvent(input as never);
        expect(res.success).toBe(false);
        expect(res.error).toBe("Ugyldig data");
        expect(prismaMock.event.create).not.toHaveBeenCalled();
    });

    it("returns a validation error when endAt is before startAt (refine)", async () => {
        const res = await createEvent(
            validEventInput({
                startAt: new Date("2026-07-01T18:00:00.000Z"),
                endAt: new Date("2026-06-01T18:00:00.000Z")
            })
        );
        expect(res.success).toBe(false);
        expect(res.error).toBe("Ugyldig data");
        expect(prismaMock.event.create).not.toHaveBeenCalled();
    });

    it("returns a validation error when registrationDeadline is after startAt (refine)", async () => {
        const res = await createEvent(
            validEventInput({
                startAt: new Date("2026-07-01T18:00:00.000Z"),
                registrationDeadline: new Date("2026-07-05T18:00:00.000Z")
            })
        );
        expect(res.success).toBe(false);
        expect(res.error).toBe("Ugyldig data");
        expect(prismaMock.event.create).not.toHaveBeenCalled();
    });

    it("creates the event, broadcasts a notification, and revalidates paths (no email by default)", async () => {
        const res = await createEvent(validEventInput());

        expect(res).toEqual({ success: true });
        expect(prismaMock.event.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    title: "Sommerfest",
                    createdById: "admin_1",
                    category: "SOCIAL"
                })
            })
        );
        expect(broadcastNotification).toHaveBeenCalledWith(
            expect.objectContaining({ type: "EVENT_CREATED", link: "/events/event_new" })
        );
        expect(revalidatePath).toHaveBeenCalledWith("/events");
        expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
        // No email unless explicitly requested.
        expect(sendEventNotification).not.toHaveBeenCalled();
    });

    it("coerces empty optional fields to null in the persisted data", async () => {
        await createEvent(validEventInput({ description: "", location: "", address: "" }));
        const arg = prismaMock.event.create.mock.calls[0][0] as { data: Record<string, unknown> };
        expect(arg.data.description).toBeNull();
        expect(arg.data.endAt).toBeNull();
        expect(arg.data.registrationDeadline).toBeNull();
        expect(arg.data.maxAttendees).toBeNull();
        expect(arg.data.totalCost).toBeNull();
        expect(arg.data.isTba).toBe(false);
    });

    it("nests program rows with an order index when a program is supplied", async () => {
        await createEvent(
            validEventInput({
                program: [
                    { time: "18:00", title: "Velkomst" },
                    { time: "19:00", title: "Middag" }
                ]
            })
        );
        const arg = prismaMock.event.create.mock.calls[0][0] as {
            data: { program?: { createMany: { data: Array<{ order: number; title: string }> } } };
        };
        expect(arg.data.program?.createMany.data).toEqual([
            expect.objectContaining({ title: "Velkomst", order: 0 }),
            expect.objectContaining({ title: "Middag", order: 1 })
        ]);
    });

    it("sends the email when sendNotification is true", async () => {
        await createEvent(validEventInput({ sendNotification: true }));
        expect(sendEventNotification).toHaveBeenCalledWith(
            expect.objectContaining({ eventTitle: "Sommerfest", eventId: "event_new" })
        );
    });

    it("returns a generic error when the create throws", async () => {
        prismaMock.event.create.mockRejectedValue(new Error("db down"));
        const res = await createEvent(validEventInput());
        expect(res.success).toBe(false);
        expect(res.error).toContain("feil");
    });
});

describe("updateEvent", () => {
    beforeEach(() => {
        setClerkUser("clerk_admin");
        prismaMock.member.findUnique.mockResolvedValue(makeAdmin({ id: "admin_1" }) as never);
        prismaMock.event.update.mockResolvedValue(makeEvent({ id: "event_1" }) as never);
    });

    it("rejects an unauthenticated caller", async () => {
        logout();
        const res = await updateEvent("event_1", validEventInput());
        expect(res).toEqual({ success: false, error: "Ikke autentisert" });
        expect(prismaMock.event.update).not.toHaveBeenCalled();
    });

    it("rejects a member without admin/moderator role", async () => {
        prismaMock.member.findUnique.mockResolvedValue(makeMember({ role: "MEMBER" }) as never);
        const res = await updateEvent("event_1", validEventInput());
        expect(res.success).toBe(false);
        expect(prismaMock.event.update).not.toHaveBeenCalled();
    });

    it("returns a validation error for invalid input", async () => {
        const res = await updateEvent("event_1", validEventInput({ title: "" }));
        expect(res.success).toBe(false);
        expect(res.error).toBe("Ugyldig data");
        expect(prismaMock.event.update).not.toHaveBeenCalled();
    });

    it("updates the event, clears+recreates program, broadcasts and revalidates", async () => {
        const res = await updateEvent(
            "event_1",
            validEventInput({ program: [{ time: "10:00", title: "Start" }] })
        );

        expect(res).toEqual({ success: true });
        const arg = prismaMock.event.update.mock.calls[0][0] as {
            where: { id: string };
            data: { program: { deleteMany: unknown; createMany?: { data: unknown[] } } };
        };
        expect(arg.where).toEqual({ id: "event_1" });
        expect(arg.data.program.deleteMany).toEqual({});
        expect(arg.data.program.createMany?.data).toEqual([
            expect.objectContaining({ title: "Start", order: 0 })
        ]);
        expect(broadcastNotification).toHaveBeenCalledWith(
            expect.objectContaining({ type: "EVENT_UPDATED", link: "/events/event_1" })
        );
        expect(revalidatePath).toHaveBeenCalledWith("/admin/events/event_1/edit");
    });

    it("broadcasts unconditionally but only emails when sendNotification is true", async () => {
        await updateEvent("event_1", validEventInput());
        expect(broadcastNotification).toHaveBeenCalled();
        expect(sendEventUpdateNotification).not.toHaveBeenCalled();

        vi.clearAllMocks();
        prismaMock.member.findUnique.mockResolvedValue(makeAdmin({ id: "admin_1" }) as never);
        prismaMock.event.update.mockResolvedValue(makeEvent({ id: "event_1" }) as never);

        await updateEvent("event_1", validEventInput({ sendNotification: true }));
        expect(sendEventUpdateNotification).toHaveBeenCalledWith(
            expect.objectContaining({ eventTitle: "Sommerfest", eventId: "event_1" })
        );
    });

    it("returns a generic error when the update throws", async () => {
        prismaMock.event.update.mockRejectedValue(new Error("db down"));
        const res = await updateEvent("event_1", validEventInput());
        expect(res.success).toBe(false);
        expect(res.error).toContain("feil");
    });
});

describe("deleteEvent", () => {
    beforeEach(() => {
        setClerkUser("clerk_admin");
        prismaMock.member.findUnique.mockResolvedValue(makeAdmin({ id: "admin_1" }) as never);
        prismaMock.event.delete.mockResolvedValue(makeEvent({ id: "event_1" }) as never);
    });

    it("rejects an unauthenticated caller", async () => {
        logout();
        const res = await deleteEvent("event_1");
        expect(res).toEqual({ success: false, error: "Ikke autentisert" });
        expect(prismaMock.event.delete).not.toHaveBeenCalled();
    });

    it("rejects a member without admin/moderator role", async () => {
        prismaMock.member.findUnique.mockResolvedValue(makeMember({ role: "MEMBER" }) as never);
        const res = await deleteEvent("event_1");
        expect(res.success).toBe(false);
        expect(prismaMock.event.delete).not.toHaveBeenCalled();
    });

    it("deletes the event and revalidates paths", async () => {
        const res = await deleteEvent("event_1");
        expect(res).toEqual({ success: true });
        expect(prismaMock.event.delete).toHaveBeenCalledWith({ where: { id: "event_1" } });
        expect(revalidatePath).toHaveBeenCalledWith("/events");
    });

    it("returns a generic error when the delete throws", async () => {
        prismaMock.event.delete.mockRejectedValue(new Error("fk violation"));
        const res = await deleteEvent("event_1");
        expect(res.success).toBe(false);
        expect(res.error).toContain("feil");
    });
});

describe("getUpcomingEvents", () => {
    it("returns an empty array for an unauthenticated caller", async () => {
        logout();
        const res = await getUpcomingEvents();
        expect(res).toEqual([]);
        expect(prismaMock.event.findMany).not.toHaveBeenCalled();
    });

    it("returns up to 3 future events ordered ascending", async () => {
        const events = [makeEvent({ id: "e1" }), makeEvent({ id: "e2" })];
        prismaMock.event.findMany.mockResolvedValue(events as never);

        const res = await getUpcomingEvents();
        expect(res).toBe(events);
        expect(prismaMock.event.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                take: 3,
                orderBy: { startAt: "asc" },
                where: expect.objectContaining({ startAt: expect.objectContaining({ gte: expect.any(Date) }) })
            })
        );
    });

    it("returns an empty array when the query throws", async () => {
        prismaMock.event.findMany.mockRejectedValue(new Error("db down"));
        const res = await getUpcomingEvents();
        expect(res).toEqual([]);
    });
});

describe("getEventParticipants", () => {
    it("rejects an unauthenticated caller", async () => {
        logout();
        const res = await getEventParticipants("event_1");
        expect(res).toEqual({ success: false, error: "Ikke autentisert" });
    });

    it("returns the participants of an event", async () => {
        const participants = [
            { id: "m1", firstName: "Ada", lastName: "L", avatarUrl: null, email: "a@x.no", phoneNumber: null }
        ];
        prismaMock.member.findMany.mockResolvedValue(participants as never);

        const res = await getEventParticipants("event_1");
        expect(res).toEqual({ success: true, participants });
        expect(prismaMock.member.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { eventsAttending: { some: { id: "event_1" } } },
                orderBy: { firstName: "asc" }
            })
        );
    });

    it("returns an error when the query throws", async () => {
        prismaMock.member.findMany.mockRejectedValue(new Error("db down"));
        const res = await getEventParticipants("event_1");
        expect(res.success).toBe(false);
        expect(res.error).toContain("deltakere");
    });
});

describe("getAllEventsForParticipation", () => {
    it("rejects an unauthenticated caller", async () => {
        logout();
        const res = await getAllEventsForParticipation();
        expect(res).toEqual({ success: false, error: "Ikke autentisert" });
    });

    it("rejects a non-admin/moderator member", async () => {
        prismaMock.member.findUnique.mockResolvedValue({ role: "MEMBER" } as never);
        const res = await getAllEventsForParticipation();
        expect(res).toEqual({ success: false, error: "Ingen tilgang" });
        expect(prismaMock.event.findMany).not.toHaveBeenCalled();
    });

    it("rejects when no member record exists", async () => {
        prismaMock.member.findUnique.mockResolvedValue(null as never);
        const res = await getAllEventsForParticipation();
        expect(res).toEqual({ success: false, error: "Ingen tilgang" });
    });

    it("returns all events for an admin, ordered by startAt desc", async () => {
        prismaMock.member.findUnique.mockResolvedValue({ role: "ADMIN" } as never);
        const events = [{ id: "e1", title: "T1", startAt: new Date() }];
        prismaMock.event.findMany.mockResolvedValue(events as never);

        const res = await getAllEventsForParticipation();
        expect(res).toEqual({ success: true, events });
        expect(prismaMock.event.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ orderBy: { startAt: "desc" } })
        );
    });

    it("returns an error when the events query throws", async () => {
        prismaMock.member.findUnique.mockResolvedValue({ role: "MODERATOR" } as never);
        prismaMock.event.findMany.mockRejectedValue(new Error("db down"));
        const res = await getAllEventsForParticipation();
        expect(res.success).toBe(false);
    });
});

describe("adminAddParticipant", () => {
    beforeEach(() => {
        prismaMock.member.findUnique.mockResolvedValue(makeAdmin() as never);
        prismaMock.event.findUnique.mockResolvedValue(makeEvent({ id: "event_1" }) as never);
        prismaMock.member.findFirst.mockResolvedValue(null as never);
        prismaMock.event.update.mockResolvedValue(makeEvent({ id: "event_1" }) as never);
    });

    it("rejects an unauthenticated caller", async () => {
        logout();
        const res = await adminAddParticipant("event_1", "member_9");
        expect(res).toEqual({ success: false, error: "Ikke autentisert" });
    });

    it("rejects a non-admin/moderator member", async () => {
        prismaMock.member.findUnique.mockResolvedValue(makeMember({ role: "MEMBER" }) as never);
        const res = await adminAddParticipant("event_1", "member_9");
        expect(res).toEqual({ success: false, error: "Ingen tilgang" });
        expect(prismaMock.event.update).not.toHaveBeenCalled();
    });

    it("returns not-found when the event does not exist", async () => {
        prismaMock.event.findUnique.mockResolvedValue(null as never);
        const res = await adminAddParticipant("missing", "member_9");
        expect(res).toEqual({ success: false, error: "Arrangement ikke funnet" });
        expect(prismaMock.event.update).not.toHaveBeenCalled();
    });

    it("is idempotent — refuses to add an already-attending member", async () => {
        prismaMock.member.findFirst.mockResolvedValue(makeMember({ id: "member_9" }) as never);
        const res = await adminAddParticipant("event_1", "member_9");
        expect(res).toEqual({ success: false, error: "Medlemmet er allerede påmeldt" });
        expect(prismaMock.event.update).not.toHaveBeenCalled();
    });

    it("connects the member to the event and revalidates", async () => {
        const res = await adminAddParticipant("event_1", "member_9");
        expect(res).toEqual({ success: true });
        expect(prismaMock.event.update).toHaveBeenCalledWith({
            where: { id: "event_1" },
            data: { attendees: { connect: { id: "member_9" } } }
        });
        expect(revalidatePath).toHaveBeenCalledWith("/events/event_1");
        expect(revalidatePath).toHaveBeenCalledWith("/admin/system/event-participation");
    });

    it("rejects when the event is full (attendee count >= maxAttendees)", async () => {
        // The event has a capacity of 2 and is already at 2 attendees, so the join is refused
        // and the event is NOT updated.
        prismaMock.event.findUnique.mockResolvedValue(
            makeEvent({ id: "event_1", maxAttendees: 2 }) as never
        );
        prismaMock.member.count.mockResolvedValue(2 as never);

        const res = await adminAddParticipant("event_1", "member_9");

        expect(res).toEqual({ success: false, error: "Arrangementet er fullt" });
        expect(prismaMock.member.count).toHaveBeenCalledWith({
            where: { eventsAttending: { some: { id: "event_1" } } }
        });
        expect(prismaMock.event.update).not.toHaveBeenCalled();
    });

    it("rejects when the event is over capacity (count strictly above maxAttendees)", async () => {
        prismaMock.event.findUnique.mockResolvedValue(
            makeEvent({ id: "event_1", maxAttendees: 2 }) as never
        );
        prismaMock.member.count.mockResolvedValue(3 as never);

        const res = await adminAddParticipant("event_1", "member_9");

        expect(res).toEqual({ success: false, error: "Arrangementet er fullt" });
        expect(prismaMock.event.update).not.toHaveBeenCalled();
    });

    it("adds the member when the event has free capacity (count < maxAttendees)", async () => {
        prismaMock.event.findUnique.mockResolvedValue(
            makeEvent({ id: "event_1", maxAttendees: 2 }) as never
        );
        prismaMock.member.count.mockResolvedValue(1 as never);

        const res = await adminAddParticipant("event_1", "member_9");

        expect(res).toEqual({ success: true });
        expect(prismaMock.event.update).toHaveBeenCalledWith({
            where: { id: "event_1" },
            data: { attendees: { connect: { id: "member_9" } } }
        });
        expect(revalidatePath).toHaveBeenCalledWith("/events/event_1");
    });

    it("does not check capacity when the event has no maxAttendees limit", async () => {
        // maxAttendees is null on the default fixture, so member.count must never run and
        // the member is added regardless of how many are already attending.
        prismaMock.event.findUnique.mockResolvedValue(
            makeEvent({ id: "event_1", maxAttendees: null }) as never
        );

        const res = await adminAddParticipant("event_1", "member_9");

        expect(res).toEqual({ success: true });
        expect(prismaMock.member.count).not.toHaveBeenCalled();
        expect(prismaMock.event.update).toHaveBeenCalled();
    });

    it("returns a generic error when the update throws", async () => {
        prismaMock.event.update.mockRejectedValue(new Error("db down"));
        const res = await adminAddParticipant("event_1", "member_9");
        expect(res.success).toBe(false);
        expect(res.error).toContain("legge til");
    });
});

describe("adminRemoveParticipant", () => {
    beforeEach(() => {
        prismaMock.member.findUnique.mockResolvedValue(makeAdmin() as never);
        prismaMock.event.update.mockResolvedValue(makeEvent({ id: "event_1" }) as never);
    });

    it("rejects an unauthenticated caller", async () => {
        logout();
        const res = await adminRemoveParticipant("event_1", "member_9");
        expect(res).toEqual({ success: false, error: "Ikke autentisert" });
    });

    it("rejects a non-admin/moderator member", async () => {
        prismaMock.member.findUnique.mockResolvedValue(makeMember({ role: "MEMBER" }) as never);
        const res = await adminRemoveParticipant("event_1", "member_9");
        expect(res).toEqual({ success: false, error: "Ingen tilgang" });
        expect(prismaMock.event.update).not.toHaveBeenCalled();
    });

    it("disconnects the member from the event and revalidates", async () => {
        const res = await adminRemoveParticipant("event_1", "member_9");
        expect(res).toEqual({ success: true });
        expect(prismaMock.event.update).toHaveBeenCalledWith({
            where: { id: "event_1" },
            data: { attendees: { disconnect: { id: "member_9" } } }
        });
        expect(revalidatePath).toHaveBeenCalledWith("/events/event_1");
    });

    it("returns a generic error when the update throws", async () => {
        prismaMock.event.update.mockRejectedValue(new Error("db down"));
        const res = await adminRemoveParticipant("event_1", "member_9");
        expect(res.success).toBe(false);
        expect(res.error).toContain("fjerne");
    });
});

describe("getMyEvents", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("rejects an unauthenticated caller", async () => {
        logout();
        const res = await getMyEvents();
        expect(res).toEqual({ success: false, error: "Ikke autentisert" });
    });

    it("returns an error when the member is not found", async () => {
        prismaMock.member.findUnique.mockResolvedValue(null as never);
        const res = await getMyEvents();
        expect(res).toEqual({ success: false, error: "Fant ikke medlem" });
    });

    it("classifies a free event (no cost) as FREE", async () => {
        prismaMock.member.findUnique.mockResolvedValue(
            makeMember({
                id: "me",
                eventsAttending: [
                    makeEvent({ id: "e_free", totalCost: null, startAt: new Date("2026-07-01T12:00:00.000Z"), createdById: "other" })
                ],
                paymentRequests: []
            }) as never
        );

        const res = await getMyEvents();
        expect(res.success).toBe(true);
        const event = res.data!.events[0];
        expect(event.status).toBe("FREE");
        expect(event.role).toBe("GUEST");
        expect(event.isPast).toBe(false);
    });

    it("classifies a paid event without a request as PENDING_PAYMENT", async () => {
        prismaMock.member.findUnique.mockResolvedValue(
            makeMember({
                id: "me",
                eventsAttending: [
                    makeEvent({ id: "e_paid", totalCost: 500, startAt: new Date("2026-07-01T12:00:00.000Z") })
                ],
                paymentRequests: []
            }) as never
        );

        const res = await getMyEvents();
        expect(res.data!.events[0].status).toBe("PENDING_PAYMENT");
    });

    it("classifies a paid event with a PAID request as CONFIRMED and marks role HOST for the creator", async () => {
        prismaMock.member.findUnique.mockResolvedValue(
            makeMember({
                id: "me",
                eventsAttending: [
                    makeEvent({ id: "e_paid", totalCost: 500, createdById: "me", startAt: new Date("2026-07-01T12:00:00.000Z") })
                ],
                paymentRequests: [
                    makePaymentRequest({ id: "pr1", eventId: "e_paid", status: "PAID" })
                ]
            }) as never
        );

        const res = await getMyEvents();
        const event = res.data!.events[0];
        expect(event.status).toBe("CONFIRMED");
        expect(event.role).toBe("HOST");
        expect(event.paymentRequestId).toBe("pr1");
    });

    it("classifies a paid event with a non-PAID request as PENDING_PAYMENT", async () => {
        prismaMock.member.findUnique.mockResolvedValue(
            makeMember({
                id: "me",
                eventsAttending: [
                    makeEvent({ id: "e_paid", totalCost: 500, startAt: new Date("2026-07-01T12:00:00.000Z") })
                ],
                paymentRequests: [
                    makePaymentRequest({ id: "pr1", eventId: "e_paid", status: "PENDING" })
                ]
            }) as never
        );

        const res = await getMyEvents();
        expect(res.data!.events[0].status).toBe("PENDING_PAYMENT");
    });

    it("sorts upcoming events first, then past events in descending date order, and computes stats", async () => {
        prismaMock.member.findUnique.mockResolvedValue(
            makeMember({
                id: "me",
                eventsAttending: [
                    // upcoming
                    makeEvent({ id: "up1", totalCost: null, startAt: new Date("2026-07-01T12:00:00.000Z") }),
                    makeEvent({ id: "up2", totalCost: null, startAt: new Date("2026-08-01T12:00:00.000Z") }),
                    // past (this year)
                    makeEvent({ id: "past_old", totalCost: null, startAt: new Date("2026-01-01T12:00:00.000Z") }),
                    makeEvent({ id: "past_new", totalCost: null, startAt: new Date("2026-05-01T12:00:00.000Z") }),
                    // a paid past event with no request -> counts towards unpaid
                    makeEvent({ id: "past_unpaid", totalCost: 300, startAt: new Date("2026-04-01T12:00:00.000Z") })
                ],
                paymentRequests: []
            }) as never
        );

        const res = await getMyEvents();
        expect(res.success).toBe(true);
        const { events, stats } = res.data!;

        // Upcoming retain input (asc by date from query) order, then past sorted desc.
        expect(events.map((e) => e.id)).toEqual(["up1", "up2", "past_new", "past_unpaid", "past_old"]);

        expect(stats.upcomingCount).toBe(2);
        expect(stats.nextEvent?.id).toBe("up1");
        // Only one PENDING_PAYMENT (the paid past event without a request).
        expect(stats.unpaidCount).toBe(1);
        // Past events in the current year: past_old, past_new, past_unpaid.
        expect(stats.totalThisYear).toBe(3);
    });

    it("returns nextEvent null and zeroed stats when there are no upcoming events", async () => {
        prismaMock.member.findUnique.mockResolvedValue(
            makeMember({
                id: "me",
                eventsAttending: [],
                paymentRequests: []
            }) as never
        );

        const res = await getMyEvents();
        expect(res.data!.events).toEqual([]);
        expect(res.data!.stats.upcomingCount).toBe(0);
        expect(res.data!.stats.nextEvent).toBeNull();
        expect(res.data!.stats.totalThisYear).toBe(0);
    });

    it("returns an error when the query throws", async () => {
        prismaMock.member.findUnique.mockRejectedValue(new Error("db down"));
        const res = await getMyEvents();
        expect(res.success).toBe(false);
        expect(res.error).toContain("hente");
    });
});
