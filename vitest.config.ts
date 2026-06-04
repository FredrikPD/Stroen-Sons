import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const resolvePath = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": resolvePath("./src"),
            // `server-only` / `client-only` throw when imported outside the Next runtime.
            // Alias them to an empty module so server code can be imported under Vitest.
            "server-only": resolvePath("./tests/helpers/empty.ts"),
            "client-only": resolvePath("./tests/helpers/empty.ts")
        }
    },
    test: {
        globals: true,
        environment: "node",
        setupFiles: ["./tests/setup.ts"],
        include: ["tests/**/*.{test,spec}.{ts,tsx}"],
        clearMocks: true,
        coverage: {
            provider: "v8",
            reportsDirectory: "./coverage",
            include: ["src/**/*.{ts,tsx}"],
            exclude: [
                "src/**/*.d.ts",
                "src/**/types/**",
                "src/app/**/layout.tsx",
                "src/app/**/page.tsx"
            ]
        }
    }
});
