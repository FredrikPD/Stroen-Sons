import { Prisma } from "@prisma/client";

/** Prisma Decimal helper. */
export const dec = (value: number | string) => new Prisma.Decimal(value);

let seq = 0;
/** Deterministic, unique-ish id generator for fixtures. */
export const id = (prefix = "id") => `${prefix}_${(seq += 1).toString().padStart(6, "0")}`;

const now = () => new Date("2026-06-04T12:00:00.000Z");

export type Overrides<T> = Partial<T>;

export function makeMember(overrides: Record<string, unknown> = {}) {
    const memberId = (overrides.id as string) ?? id("member");
    return {
        id: memberId,
        clerkId: `clerk_${memberId}`,
        email: `${memberId}@example.com`,
        firstName: "Test",
        lastName: "Member",
        avatarUrl: null,
        phoneNumber: null,
        address: null,
        zipCode: null,
        city: null,
        membershipType: "STANDARD",
        userRoleId: null,
        userRole: null,
        role: "MEMBER",
        status: "ACTIVE",
        balance: dec(0),
        pauseMonthlyFees: false,
        createdAt: now(),
        updatedAt: now(),
        lastActiveAt: now(),
        deletedAt: null,
        ...overrides
    };
}

export function makeAdmin(overrides: Record<string, unknown> = {}) {
    return makeMember({ role: "ADMIN", ...overrides });
}

export function makePaymentRequest(overrides: Record<string, unknown> = {}) {
    const reqId = (overrides.id as string) ?? id("req");
    return {
        id: reqId,
        title: "Medlemskontingent 2026-06",
        description: "Månedlig kontingent for 6/2026",
        amount: dec(750),
        dueDate: new Date("2026-06-30T00:00:00.000Z"),
        status: "PENDING",
        category: "MEMBERSHIP_FEE",
        memberId: id("member"),
        eventId: null,
        transactionId: null,
        createdAt: now(),
        updatedAt: now(),
        ...overrides
    };
}

export function makeTransaction(overrides: Record<string, unknown> = {}) {
    return {
        id: (overrides.id as string) ?? id("tx"),
        amount: dec(750),
        description: "Medlemskontingent 2026-06",
        category: "MEMBERSHIP_FEE",
        date: now(),
        memberId: id("member"),
        eventId: null,
        receiptUrl: null,
        receiptKey: null,
        createdAt: now(),
        updatedAt: now(),
        ...overrides
    };
}

export function makePayment(overrides: Record<string, unknown> = {}) {
    return {
        id: (overrides.id as string) ?? id("pay"),
        period: "2026-06",
        amount: 750,
        status: "UNPAID",
        paidAt: null,
        memberId: id("member"),
        updatedAt: now(),
        ...overrides
    };
}

export function makeEvent(overrides: Record<string, unknown> = {}) {
    return {
        id: (overrides.id as string) ?? id("event"),
        title: "Test Event",
        description: "An event",
        category: "SOCIAL",
        coverImage: null,
        location: null,
        address: null,
        isTba: false,
        startAt: new Date("2026-07-01T18:00:00.000Z"),
        endAt: null,
        registrationDeadline: null,
        maxAttendees: null,
        totalCost: null,
        clubSubsidy: null,
        createdById: id("member"),
        createdAt: now(),
        updatedAt: now(),
        ...overrides
    };
}

export function makePost(overrides: Record<string, unknown> = {}) {
    return {
        id: (overrides.id as string) ?? id("post"),
        title: "Test Post",
        content: "Body",
        category: "NYHET",
        isPinned: false,
        authorId: id("member"),
        eventId: null,
        createdAt: now(),
        updatedAt: now(),
        ...overrides
    };
}

export function makeUserRole(overrides: Record<string, unknown> = {}) {
    return {
        id: (overrides.id as string) ?? id("role"),
        name: "Editor",
        description: null,
        isSystem: false,
        allowedPaths: [] as string[],
        createdAt: now(),
        updatedAt: now(),
        ...overrides
    };
}

export function makeMembershipType(overrides: Record<string, unknown> = {}) {
    return {
        id: (overrides.id as string) ?? id("mtype"),
        name: "STANDARD",
        description: null,
        fee: 750,
        createdAt: now(),
        updatedAt: now(),
        ...overrides
    };
}

export function makeNotification(overrides: Record<string, unknown> = {}) {
    return {
        id: (overrides.id as string) ?? id("notif"),
        memberId: id("member"),
        type: "POST_CREATED",
        title: "Notification",
        message: "Message",
        link: null,
        read: false,
        createdAt: now(),
        ...overrides
    };
}

export function makeCategory(overrides: Record<string, unknown> = {}) {
    return {
        id: (overrides.id as string) ?? id("cat"),
        name: "General",
        description: null,
        color: "blue",
        createdAt: now(),
        ...overrides
    };
}

/** A Clerk user shape compatible with `currentUser()`. */
export function makeClerkUser(overrides: Record<string, unknown> = {}) {
    return {
        id: "clerk_user_1",
        firstName: "Test",
        lastName: "User",
        imageUrl: "https://img.example/avatar.png",
        emailAddresses: [{ emailAddress: "test.user@example.com" }],
        ...overrides
    };
}
