import { vi } from "vitest";
import { ensureMember } from "@/server/auth/ensureMember";
import { ensureRole } from "@/server/auth/ensureRole";
import { auth, currentUser } from "@clerk/nextjs/server";
import { makeMember, makeAdmin, makeClerkUser } from "./fixtures";

// These modules are globally mocked in tests/setup.ts, so the imports above are mock fns.
export const ensureMemberMock = vi.mocked(ensureMember);
export const ensureRoleMock = vi.mocked(ensureRole);
export const authMock = vi.mocked(auth);
export const currentUserMock = vi.mocked(currentUser);

/** Configure ensureMember/ensureRole to resolve to the given member. */
export function loginAs(member: Record<string, unknown>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ensureMemberMock.mockResolvedValue(member as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ensureRoleMock.mockResolvedValue(member as any);
    return member;
}

export function loginAsAdmin(overrides: Record<string, unknown> = {}) {
    return loginAs(makeAdmin(overrides));
}

export function loginAsMember(overrides: Record<string, unknown> = {}) {
    return loginAs(makeMember(overrides));
}

/** Simulate an unauthenticated caller. */
export function logout() {
    ensureMemberMock.mockRejectedValue(new Error("Unauthorized"));
    ensureRoleMock.mockRejectedValue(new Error("Unauthorized"));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    authMock.mockResolvedValue({ userId: null } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentUserMock.mockResolvedValue(null as any);
}

/** Configure the raw Clerk primitives (for ensureMember / getAuthContext tests). */
export function setClerkUser(clerkUserId: string | null = "clerk_user_1", user: Record<string, unknown> | null = makeClerkUser()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    authMock.mockResolvedValue({ userId: clerkUserId } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentUserMock.mockResolvedValue(user as any);
}

/** Reset + apply sensible defaults: authenticated admin. Called in the global beforeEach. */
export function resetAuthMocks() {
    ensureMemberMock.mockReset();
    ensureRoleMock.mockReset();
    authMock.mockReset();
    currentUserMock.mockReset();
    loginAsAdmin();
    setClerkUser();
}
