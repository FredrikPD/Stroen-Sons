import type { PrismaClient } from "@prisma/client";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";

/**
 * Deep mock of the Prisma client. The real `@/server/db` module is replaced with this
 * mock in `tests/setup.ts`, so importing `prisma`/`db` anywhere in the app returns this.
 *
 * Configure return values per test, e.g.:
 *   prismaMock.member.findUnique.mockResolvedValue(makeMember());
 * and assert on writes, e.g.:
 *   expect(prismaMock.member.update).toHaveBeenCalledWith(...);
 */
export const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

/**
 * Make `prisma.$transaction(cb)` run the callback with the mock client itself, so code
 * that does `prisma.$transaction(async (tx) => { tx.member.update(...) })` records calls
 * on `prismaMock`. Also supports the array form `prisma.$transaction([...])`.
 */
export function configureTransaction() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prismaMock.$transaction as any).mockImplementation(async (arg: any) => {
        if (typeof arg === "function") {
            return arg(prismaMock);
        }
        if (Array.isArray(arg)) {
            return Promise.all(arg);
        }
        return undefined;
    });
}

export function resetPrismaMock() {
    mockReset(prismaMock);
    configureTransaction();
}
