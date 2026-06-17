"use client";

const CONTAINER = "mx-auto w-full px-4 sm:px-5 lg:px-6";

export default function Footer() {
    return (
        <footer
            className="shrink-0 z-20 text-gray-400"
            style={{ background: "#0f0e0c", borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
            <div className={CONTAINER + " flex h-14 items-center justify-between gap-4"}>
                {/* Left: copyright */}
                <p className="text-sm font-medium text-gray-300 whitespace-nowrap">
                    &copy; 2026 Strøen Søns
                </p>

                {/* Right: brand */}
                <span
                    className="text-gray-300 text-[13px] tracking-[0.12em] uppercase whitespace-nowrap"
                    style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                >
                    Strøen Søns
                </span>
            </div>
        </footer>
    );
}
