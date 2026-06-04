import { describe, it, expect } from "vitest";
import {
    CATEGORY_COLORS,
    getCategoryColorClasses,
    getCategoryStyleString
} from "@/lib/category-colors";

describe("category-colors", () => {
    it("returns the matching classes for a known color value", () => {
        const green = getCategoryColorClasses("green");
        expect(green).toEqual({
            bg: "bg-emerald-50",
            text: "text-emerald-700",
            border: "border-emerald-100",
            dot: "bg-emerald-500"
        });
    });

    it("falls back to blue for an unknown color value", () => {
        expect(getCategoryColorClasses("not-a-color")).toEqual({
            bg: "bg-blue-50",
            text: "text-blue-600",
            border: "border-blue-100",
            dot: "bg-blue-500"
        });
    });

    it("every predefined color resolves to its own classes", () => {
        for (const color of CATEGORY_COLORS) {
            expect(getCategoryColorClasses(color.value)).toEqual({
                bg: color.bg,
                text: color.text,
                border: color.border,
                dot: color.dot
            });
        }
    });

    it("builds a space-joined style string of bg/text/border", () => {
        expect(getCategoryStyleString("red")).toBe("bg-red-50 text-red-600 border-red-100");
    });

    it("style string falls back to blue for unknown values", () => {
        expect(getCategoryStyleString("xyz")).toBe("bg-blue-50 text-blue-600 border-blue-100");
    });
});
