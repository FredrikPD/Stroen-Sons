import { beforeEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { prismaMock, resetPrismaMock } from "./helpers/prisma";

// --- Global module mocks (applied to every test file via setupFiles) ---

// The Prisma client. `db`, `prisma` and `ACTIVE_MEMBER_FILTER` all come from this module.
vi.mock("@/server/db", () => ({
    db: prismaMock,
    prisma: prismaMock,
    ACTIVE_MEMBER_FILTER: { deletedAt: null }
}));

// Auth boundary — replaced with vi.fn()s configured via tests/helpers/auth.ts.
vi.mock("@/server/auth/ensureMember", () => ({ ensureMember: vi.fn() }));
vi.mock("@/server/auth/ensureRole", () => ({ ensureRole: vi.fn() }));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    unstable_cache: (fn: any) => fn
}));

vi.mock("next/navigation", () => ({
    redirect: vi.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
    notFound: vi.fn(() => {
        throw new Error("NEXT_NOT_FOUND");
    })
}));

vi.mock("next/headers", () => ({
    headers: vi.fn(async () => new Map<string, string>()),
    cookies: vi.fn(async () => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }))
}));

vi.mock("@clerk/nextjs/server", () => ({
    auth: vi.fn(async () => ({ userId: "clerk_user_1" })),
    currentUser: vi.fn(async () => null),
    clerkClient: vi.fn(async () => ({
        users: {
            getUser: vi.fn(),
            updateUserMetadata: vi.fn(),
            deleteUser: vi.fn(),
            getUserList: vi.fn(async () => ({ data: [], totalCount: 0 }))
        },
        invitations: {
            createInvitation: vi.fn(),
            revokeInvitation: vi.fn(),
            getInvitationList: vi.fn(async () => ({ data: [], totalCount: 0 }))
        }
    }))
}));

// Push delivery — never attempt real Web Push in tests.
vi.mock("@/server/push/web-push", () => ({
    isPushConfigured: vi.fn(() => false),
    sendPushSignalToMember: vi.fn(async () => ({ success: true, sent: 0 })),
    sendPushSignalToMembers: vi.fn(async () => ({ success: true, sent: 0 }))
}));

// Imported after the mocks above are registered.
// eslint-disable-next-line import/first
import { resetAuthMocks } from "./helpers/auth";

beforeEach(() => {
    resetPrismaMock();
    resetAuthMocks();
});
