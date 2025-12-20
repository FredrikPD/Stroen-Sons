import type { Config } from "tailwindcss";
import { withUt } from "uploadthing/tw";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light theme (fra dashboard-bildet / HTML-filen)
        primary: "#b08d55",
        "primary-hover": "#947545",
        "primary-light": "#fdf8f0",
        "background-main": "#fcfbf9",
        "background-sidebar": "#f5f3ef",
        "card-bg": "#ffffff",
        "border-color": "#e5e0d6",
        "text-main": "#1a1a1a",
        "text-secondary": "#6b665e",
        "accent-dark": "#2c2a26",

        // Dark header (fra header-snippetet ditt)
        "background-dark": "#0f0e0c",
        "surface-dark": "#171614",
        "surface-highlight": "#2a2826",
        cream: "#f4efe6",
        "cream-muted": "#c9c2b8",
      },
      fontFamily: {
        display: ["var(--font-display)"],
      },
      borderRadius: {
        lg: "0.5rem",
        xl: "0.75rem",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
  ],
};

export default withUt(config);