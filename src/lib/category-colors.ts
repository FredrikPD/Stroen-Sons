// Predefined color options for categories
export const CATEGORY_COLORS = [
    { name: "Blå", value: "blue", bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100", dot: "bg-blue-500" },
    { name: "Rød", value: "red", bg: "bg-red-50", text: "text-red-600", border: "border-red-100", dot: "bg-red-500" },
    { name: "Grønn", value: "green", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100", dot: "bg-emerald-500" },
    { name: "Gul", value: "amber", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100", dot: "bg-amber-500" },
    { name: "Lilla", value: "purple", bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100", dot: "bg-purple-500" },
    { name: "Rosa", value: "pink", bg: "bg-pink-50", text: "text-pink-600", border: "border-pink-100", dot: "bg-pink-500" },
    { name: "Indigo", value: "indigo", bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100", dot: "bg-indigo-500" },
    { name: "Cyan", value: "cyan", bg: "bg-cyan-50", text: "text-cyan-600", border: "border-cyan-100", dot: "bg-cyan-500" },
    { name: "Oransje", value: "orange", bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-100", dot: "bg-orange-500" },
    { name: "Grå", value: "gray", bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200", dot: "bg-gray-500" },
] as const;

export type CategoryColor = typeof CATEGORY_COLORS[number]["value"];

export function getCategoryColorClasses(colorValue: string) {
    const color = CATEGORY_COLORS.find(c => c.value === colorValue);
    if (!color) return { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100", dot: "bg-blue-500" };
    return { bg: color.bg, text: color.text, border: color.border, dot: color.dot };
}

export function getCategoryStyleString(colorValue: string) {
    const { bg, text, border } = getCategoryColorClasses(colorValue);
    return `${bg} ${text} ${border}`;
}
