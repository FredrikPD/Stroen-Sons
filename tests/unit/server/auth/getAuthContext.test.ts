import { describe, it, expect } from "vitest";
import { getAuthContext } from "@/server/auth/getAuthContext";
import { makeClerkUser } from "../../../helpers/fixtures";
import { authMock, currentUserMock } from "../../../helpers/auth";

// `getAuthContext` is NOT globally mocked, so we import the real implementation and
// drive it via the Clerk `auth` / `currentUser` mocks.

describe("getAuthContext", () => {
    it("returns null when there is no Clerk userId", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        authMock.mockResolvedValue({ userId: null } as any);
        await expect(getAuthContext()).resolves.toBeNull();
        // Short-circuits before calling currentUser.
        expect(currentUserMock).not.toHaveBeenCalled();
    });

    it("returns null when currentUser() resolves to null", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        authMock.mockResolvedValue({ userId: "clerk_x" } as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentUserMock.mockResolvedValue(null as any);
        await expect(getAuthContext()).resolves.toBeNull();
    });

    it("throws Missing email when the user has no email address", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        authMock.mockResolvedValue({ userId: "clerk_x" } as any);
        currentUserMock.mockResolvedValue(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            makeClerkUser({ emailAddresses: [] }) as any
        );
        await expect(getAuthContext()).rejects.toThrow("Missing email");
    });

    it("returns the context with a lower-cased email and Clerk names", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        authMock.mockResolvedValue({ userId: "clerk_42" } as any);
        currentUserMock.mockResolvedValue(
            makeClerkUser({
                firstName: "Ada",
                lastName: "Lovelace",
                emailAddresses: [{ emailAddress: "Ada.Lovelace@Example.COM" }]
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }) as any
        );

        const ctx = await getAuthContext();

        expect(ctx).toEqual({
            userId: "clerk_42",
            email: "ada.lovelace@example.com",
            firstName: "Ada",
            lastName: "Lovelace"
        });
    });

    it("preserves null first/last names from Clerk", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        authMock.mockResolvedValue({ userId: "clerk_7" } as any);
        currentUserMock.mockResolvedValue(
            makeClerkUser({
                firstName: null,
                lastName: null,
                emailAddresses: [{ emailAddress: "noname@example.com" }]
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }) as any
        );

        const ctx = await getAuthContext();

        expect(ctx).toEqual({
            userId: "clerk_7",
            email: "noname@example.com",
            firstName: null,
            lastName: null
        });
    });
});
