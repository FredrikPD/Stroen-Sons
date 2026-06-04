import { describe, it, expect } from "vitest";
import { MEMBER_FEES } from "@/lib/finance";

describe("MEMBER_FEES constants", () => {
    it("defines the expected fee for each membership type", () => {
        expect(MEMBER_FEES.STANDARD).toBe(750);
        expect(MEMBER_FEES.STUDENT).toBe(250);
        expect(MEMBER_FEES.HONORARY).toBe(0);
        expect(MEMBER_FEES.SUPPORT).toBe(100);
    });

    it("exposes exactly the four known membership types", () => {
        expect(Object.keys(MEMBER_FEES).sort()).toEqual(["HONORARY", "STANDARD", "STUDENT", "SUPPORT"]);
    });

    it("uses numeric values for every fee", () => {
        for (const value of Object.values(MEMBER_FEES)) {
            expect(typeof value).toBe("number");
            expect(Number.isFinite(value)).toBe(true);
            expect(value).toBeGreaterThanOrEqual(0);
        }
    });

    it("orders the standard fee above the student fee", () => {
        expect(MEMBER_FEES.STANDARD).toBeGreaterThan(MEMBER_FEES.STUDENT);
        expect(MEMBER_FEES.STUDENT).toBeGreaterThan(MEMBER_FEES.SUPPORT);
        expect(MEMBER_FEES.SUPPORT).toBeGreaterThan(MEMBER_FEES.HONORARY);
    });
});
