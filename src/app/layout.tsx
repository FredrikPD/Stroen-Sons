// import "@uploadthing/react/styles.css";
import "./globals.css";
import NextTopLoader from "nextjs-toploader";
import { ClerkProvider } from "@clerk/nextjs";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "@/app/api/uploadthing/core";
import { ModalProvider } from "@/components/providers/ModalContext";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";

import { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  themeColor: "#4F46E5",
};

export const metadata: Metadata = {
  title: {
    template: '%s | Strøen Søns',
    default: 'Strøen Søns',
  },
  description: 'Foreningen for gentlemen',
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    title: "Strøen Søns",
    capable: true,
    statusBarStyle: "default",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="no">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
            rel="stylesheet"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block"
            rel="stylesheet"
          />
        </head>
        <body className="bg-background-main text-text-main font-display">
          <RegisterServiceWorker />
          <NextTopLoader color="#4F46E5" showSpinner={false} />
          <NextSSRPlugin
            /**
             * The `extractRouterConfig` will extract all the route configurations
             * from the router to prevent additional network requests.
             */
            routerConfig={extractRouterConfig(ourFileRouter)}
          />
          <ModalProvider>
            {children}
          </ModalProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
