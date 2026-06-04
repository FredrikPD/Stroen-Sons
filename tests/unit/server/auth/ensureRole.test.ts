import { describe, it, expect, beforeEach } from "vitest";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { makeMember, makeAdmin, makeUserRole } from "../../../helpers/fixtures";
import { ensureMemberMock } from "../../../helpers/auth";

// `@/server/auth/ensureRole` is globally mocked in tests/setup.ts; load the REAL one.
// Its internal `import { ensureMember } from "./ensureMember"` resolves to the global
// mock (controlled via ensureMemberMock), and it uses the REAL `checkAccess`.
const { ensureRole } = await vi.importActual<typeof import("@/server/auth/ensureRole")>(
    "@/server/auth/ensureRole"
);

const headersMock = vi.mocked(headers);
const redirectMock = vi.mocked(redirect);

/** Make `headers()` return a Map seeded with x-current-path. */
function setCurrentPath(path: string | null) {
    const map = new Map<string, string>();
    if (path !== null) map.set("x-current-path", path);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    headersMock.mockResolvedValue(map as any);
}

beforeEach(() => {
    setCurrentPath(null);
});

describe("ensureRole", () => {
    describe("dynamic access check (priority)", () => {
        it("returns the member when their userRole grants the current path", async () => {
            setCurrentPath("/admin/events");
            const member = makeMember({
                id: "m_editor",
                role: "MEMBER",
                userRole: makeUserRole({ name: "Editor", allowedPaths: ["/admin/events.*"] })
            });
            ensureMemberMock.mockResolvedValue(member as never);

            const result = await ensureRole(["ADMIN"]);

            expect(result).toBe(member);
            expect(redirectMock).not.toHaveBeenCalled();
        });

        it('returns the member when their "Admin"-named userRole bypasses any path', async () => {
            setCurrentPath("/admin/finance");
            const member = makeMember({
                role: "MEMBER",
                userRole: makeUserRole({ name: "Admin", allowedPaths: [] })
            });
            ensureMemberMock.mockResolvedValue(member as never);

            await expect(ensureRole(["ADMIN"])).resolves.toBe(member);
            expect(redirectMock).not.toHaveBeenCalled();
        });

        it("falls through to the legacy check when the dynamic check denies the path", async () => {
            setCurrentPath("/admin/finance");
            // userRole only allows /admin/events, but the legacy ADMIN enum rescues access.
            const member = makeAdmin({
                userRole: makeUserRole({ name: "Editor", allowedPaths: ["/admin/events.*"] })
            });
            ensureMemberMock.mockResolvedValue(member as never);

            const result = await ensureRole(["ADMIN"]);

            expect(result).toBe(member);
            expect(redirectMock).not.toHaveBeenCalled();
        });
    });

    describe("legacy enum fallback", () => {
        it("returns the member when there is no current path but the enum role is allowed", async () => {
            setCurrentPath(null);
            const member = makeAdmin({ userRole: null });
            ensureMemberMock.mockResolvedValue(member as never);

            await expect(ensureRole(["ADMIN"])).resolves.toBe(member);
            expect(redirectMock).not.toHaveBeenCalled();
        });

        it("returns the member when they have no userRole but the enum role matches", async () => {
            setCurrentPath("/admin/finance");
            const member = makeMember({ role: "MODERATOR", userRole: null });
            ensureMemberMock.mockResolvedValue(member as never);

            await expect(ensureRole(["MODERATOR", "ADMIN"])).resolves.toBe(member);
            expect(redirectMock).not.toHaveBeenCalled();
        });

        it("matches when the enum role is one of several allowed roles", async () => {
            const member = makeMember({ role: "MODERATOR", userRole: null });
            ensureMemberMock.mockResolvedValue(member as never);

            await expect(ensureRole(["ADMIN", "MODERATOR"])).resolves.toBe(member);
        });
    });

    describe("denial / redirect", () => {
        it("redirects to /admin/access-denied when both dynamic and legacy checks fail", async () => {
            setCurrentPath("/admin/finance");
            const member = makeMember({
                role: "MEMBER",
                userRole: makeUserRole({ name: "Editor", allowedPaths: ["/admin/events.*"] })
            });
            ensureMemberMock.mockResolvedValue(member as never);

            await expect(ensureRole(["ADMIN"])).rejects.toThrow(
                "NEXT_REDIRECT:/admin/access-denied"
            );
            expect(redirectMock).toHaveBeenCalledWith("/admin/access-denied");
        });

        it("redirects when there is no current path and the enum role is not allowed", async () => {
            setCurrentPath(null);
            const member = makeMember({ role: "MEMBER", userRole: null });
            ensureMemberMock.mockResolvedValue(member as never);

            await expect(ensureRole(["ADMIN"])).rejects.toThrow(
                "NEXT_REDIRECT:/admin/access-denied"
            );
        });

        it("redirects when the userRole exists but does not match the path and the enum role is disallowed", async () => {
            setCurrentPath("/admin/finance");
            const member = makeMember({
                role: "MEMBER",
                userRole: makeUserRole({ name: "Editor", allowedPaths: [] })
            });
            ensureMemberMock.mockResolvedValue(member as never);

            await expect(ensureRole(["ADMIN"])).rejects.toThrow("NEXT_REDIRECT:");
        });
    });

    describe("propagation of authentication failure", () => {
        it("propagates an Unauthorized error thrown by ensureMember", async () => {
            ensureMemberMock.mockRejectedValue(new Error("Unauthorized"));
            await expect(ensureRole(["ADMIN"])).rejects.toThrow("Unauthorized");
            expect(redirectMock).not.toHaveBeenCalled();
        });
    });
});
