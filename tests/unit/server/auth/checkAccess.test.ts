import { describe, it, expect } from "vitest";
import { checkAccess } from "@/server/auth/checkAccess";
import { makeUserRole } from "../../../helpers/fixtures";

// `checkAccess(role, path)` is a pure function. The `UserRole` import in the source
// is type-only, so no Prisma/runtime mocking is required here.
// The fixtures `makeUserRole` shape is structurally compatible with a UserRole row.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const role = (overrides: Record<string, unknown> = {}) => makeUserRole(overrides) as any;

describe("checkAccess", () => {
    describe("null / undefined role", () => {
        it("returns false when role is null", () => {
            expect(checkAccess(null, "/admin/events")).toBe(false);
        });

        it("returns false when role is undefined", () => {
            expect(checkAccess(undefined, "/admin/events")).toBe(false);
        });
    });

    describe('"Admin" role bypass', () => {
        it('grants access to any path when role name is exactly "Admin"', () => {
            const admin = role({ name: "Admin", allowedPaths: [] });
            expect(checkAccess(admin, "/admin/events")).toBe(true);
            expect(checkAccess(admin, "/literally/anything")).toBe(true);
            expect(checkAccess(admin, "/")).toBe(true);
        });

        it('is case-sensitive — "admin" (lowercase) is NOT the bypass and has no paths', () => {
            const notBypass = role({ name: "admin", allowedPaths: [] });
            expect(checkAccess(notBypass, "/admin/events")).toBe(false);
        });
    });

    describe("empty / missing allowedPaths", () => {
        it("returns false when allowedPaths is an empty array (non-Admin role)", () => {
            const r = role({ name: "Editor", allowedPaths: [] });
            expect(checkAccess(r, "/admin/events")).toBe(false);
        });

        it("returns false when allowedPaths is undefined", () => {
            const r = role({ name: "Editor", allowedPaths: undefined });
            expect(checkAccess(r, "/admin/events")).toBe(false);
        });

        it("returns false when allowedPaths is null", () => {
            const r = role({ name: "Editor", allowedPaths: null });
            expect(checkAccess(r, "/admin/events")).toBe(false);
        });
    });

    describe('special case for "/admin" and "/admin/dashboard"', () => {
        it('allows "/admin" when ANY allowedPath starts with "/admin"', () => {
            const r = role({ name: "Editor", allowedPaths: ["/admin/events"] });
            expect(checkAccess(r, "/admin")).toBe(true);
        });

        it('allows "/admin/dashboard" when ANY allowedPath starts with "/admin"', () => {
            const r = role({ name: "Editor", allowedPaths: ["/admin/finance"] });
            expect(checkAccess(r, "/admin/dashboard")).toBe(true);
        });

        it('allows "/admin" via the wildcard "*" allowedPath', () => {
            const r = role({ name: "Editor", allowedPaths: ["*"] });
            expect(checkAccess(r, "/admin")).toBe(true);
        });

        it('allows "/admin" via an exact "/admin" allowedPath', () => {
            const r = role({ name: "Editor", allowedPaths: ["/admin"] });
            expect(checkAccess(r, "/admin")).toBe(true);
        });

        it('denies "/admin" when no allowedPath references "/admin" or wildcard', () => {
            const r = role({ name: "Editor", allowedPaths: ["/members", "/events"] });
            expect(checkAccess(r, "/admin")).toBe(false);
            expect(checkAccess(r, "/admin/dashboard")).toBe(false);
        });
    });

    describe("regex pattern matching (anchored ^pattern$)", () => {
        it("matches an exact literal pattern", () => {
            const r = role({ name: "Editor", allowedPaths: ["/admin/events"] });
            expect(checkAccess(r, "/admin/events")).toBe(true);
        });

        it("does NOT match a longer path for an exact literal pattern (anchoring)", () => {
            const r = role({ name: "Editor", allowedPaths: ["/admin/events"] });
            expect(checkAccess(r, "/admin/events/new")).toBe(false);
        });

        it("does NOT match a path that is only a prefix of the pattern (anchoring)", () => {
            const r = role({ name: "Editor", allowedPaths: ["/admin/events"] });
            expect(checkAccess(r, "/admin/event")).toBe(false);
        });

        it('matches sub-paths with a ".*" regex suffix', () => {
            const r = role({ name: "Editor", allowedPaths: ["/admin/events.*"] });
            expect(checkAccess(r, "/admin/events")).toBe(true);
            expect(checkAccess(r, "/admin/events/new")).toBe(true);
            expect(checkAccess(r, "/admin/events/123/edit")).toBe(true);
        });

        it('a ".*" suffix pattern does not match an unrelated path', () => {
            const r = role({ name: "Editor", allowedPaths: ["/admin/events.*"] });
            expect(checkAccess(r, "/admin/finance")).toBe(false);
        });

        it("returns true when ANY one of several patterns matches", () => {
            const r = role({
                name: "Editor",
                allowedPaths: ["/admin/finance.*", "/admin/events.*", "/members"]
            });
            expect(checkAccess(r, "/admin/events/5")).toBe(true);
        });

        it("returns false when NONE of the patterns match", () => {
            const r = role({
                name: "Editor",
                allowedPaths: ["/admin/finance.*", "/members"]
            });
            expect(checkAccess(r, "/admin/events/5")).toBe(false);
        });
    });

    describe('wildcard "*"', () => {
        // A bare "*" pattern is handled BEFORE the regex compile and grants full access
        // to ANY path (not just the "/admin" special case).
        it('"*" grants access to a non-/admin path (handled before the regex compile)', () => {
            const r = role({ name: "Editor", allowedPaths: ["*"] });
            expect(checkAccess(r, "/members")).toBe(true);
            expect(checkAccess(r, "/anything/deep/path")).toBe(true);
            expect(checkAccess(r, "")).toBe(true);
            expect(checkAccess(r, "/")).toBe(true);
        });

        it('"*" still grants access to /admin paths', () => {
            const r = role({ name: "Editor", allowedPaths: ["*"] });
            expect(checkAccess(r, "/admin")).toBe(true);
            expect(checkAccess(r, "/admin/dashboard")).toBe(true);
            expect(checkAccess(r, "/admin/events/123/edit")).toBe(true);
        });

        it('"*" grants access even when listed alongside other (non-matching) patterns', () => {
            const r = role({ name: "Editor", allowedPaths: ["/members", "*"] });
            expect(checkAccess(r, "/anything/deep/path")).toBe(true);
        });

        it('a genuine catch-all ".*" pattern DOES grant access to any path', () => {
            const r = role({ name: "Editor", allowedPaths: [".*"] });
            expect(checkAccess(r, "/members")).toBe(true);
            expect(checkAccess(r, "/anything/deep/path")).toBe(true);
            expect(checkAccess(r, "")).toBe(true);
        });
    });

    describe("invalid regex patterns", () => {
        it("returns false (and does not throw) when a pattern is an invalid regex", () => {
            // "[" is an unterminated character class -> `new RegExp("^[$")` throws.
            const r = role({ name: "Editor", allowedPaths: ["["] });
            expect(checkAccess(r, "/members")).toBe(false);
        });

        it("skips an invalid pattern but still matches a later valid one", () => {
            const r = role({ name: "Editor", allowedPaths: ["[", "/members"] });
            expect(checkAccess(r, "/members")).toBe(true);
        });
    });
});
