import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Strøen Søns",
        short_name: "Strøen Søns",
        description: "Foreningen for gentlemen",
        start_url: "/dashboard",
        scope: "/",
        display: "standalone",
        background_color: "#4F46E5",
        theme_color: "#4F46E5",
        icons: [
            {
                src: "/pwa-192x192.png",
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: "/pwa-512x512.png",
                sizes: "512x512",
                type: "image/png",
            },
            {
                src: "/pwa-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
            },
        ],
    };
}
