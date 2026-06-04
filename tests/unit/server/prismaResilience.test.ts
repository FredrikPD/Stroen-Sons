import { describe, it, expect, vi } from "vitest";
import { isTransientPrismaError, withPrismaRetry } from "@/server/prismaResilience";

describe("isTransientPrismaError", () => {
    it("treats the P6000 Accelerate code as transient", () => {
        expect(isTransientPrismaError({ code: "P6000" })).toBe(true);
    });

    it("detects transient code nested under cause", () => {
        expect(isTransientPrismaError(new Error("boom", { cause: { code: "P6000" } }))).toBe(true);
    });

    it.each([
        "Accelerate experienced an error communicating with your Query Engine",
        "Query timeout exceeded",
        "TypeError: fetch failed",
        "UND_ERR_SOCKET happened",
        "SocketError: other side closed"
    ])("recognizes transient message: %s", (message) => {
        expect(isTransientPrismaError(new Error(message))).toBe(true);
    });

    it("follows the cause chain for transient messages", () => {
        const err = new Error("outer", { cause: new Error("Query timeout exceeded") });
        expect(isTransientPrismaError(err)).toBe(true);
    });

    it("returns false for non-transient errors", () => {
        expect(isTransientPrismaError(new Error("Unique constraint failed"))).toBe(false);
        expect(isTransientPrismaError({ code: "P2002" })).toBe(false);
        expect(isTransientPrismaError(null)).toBe(false);
        expect(isTransientPrismaError("just a string")).toBe(false);
    });
});

describe("withPrismaRetry", () => {
    it("returns the result without retrying on success", async () => {
        const op = vi.fn(async () => "ok");
        await expect(withPrismaRetry(op)).resolves.toBe("ok");
        expect(op).toHaveBeenCalledTimes(1);
    });

    it("retries transient failures and eventually succeeds", async () => {
        const op = vi
            .fn()
            .mockRejectedValueOnce(new Error("Query timeout exceeded"))
            .mockResolvedValueOnce("recovered");

        await expect(withPrismaRetry(op, { baseDelayMs: 0, maxDelayMs: 0 })).resolves.toBe("recovered");
        expect(op).toHaveBeenCalledTimes(2);
    });

    it("throws immediately on a non-transient error without retrying", async () => {
        const op = vi.fn(async () => {
            throw new Error("Unique constraint failed");
        });
        await expect(withPrismaRetry(op, { baseDelayMs: 0 })).rejects.toThrow("Unique constraint failed");
        expect(op).toHaveBeenCalledTimes(1);
    });

    it("gives up after exhausting attempts and throws the last error", async () => {
        const op = vi.fn(async () => {
            throw new Error("Query timeout exceeded");
        });
        await expect(
            withPrismaRetry(op, { attempts: 3, baseDelayMs: 0, maxDelayMs: 0 })
        ).rejects.toThrow("Query timeout exceeded");
        expect(op).toHaveBeenCalledTimes(3);
    });
});
