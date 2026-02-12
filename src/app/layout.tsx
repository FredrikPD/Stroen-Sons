// import "@uploadthing/react/styles.css";
import "./globals.css";
import NextTopLoader from "nextjs-toploader";
import { ClerkProvider } from "@clerk/nextjs";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "@/app/api/uploadthing/core";
import { ModalProvider } from "@/components/providers/ModalContext";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";
import { AppLaunchOverlay } from "@/components/pwa/AppLaunchOverlay";
import { Toaster } from "sonner";

import { Metadata, Viewport } from 'next';

const APPLE_STARTUP_IMAGES = [
  {
    href: "/splash/apple-splash-640x1136.png",
    media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
  {
    href: "/splash/apple-splash-750x1334.png",
    media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
  {
    href: "/splash/apple-splash-1242x2208.png",
    media: "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    href: "/splash/apple-splash-1125x2436.png",
    media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    href: "/splash/apple-splash-828x1792.png",
    media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
  {
    href: "/splash/apple-splash-1242x2688.png",
    media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    href: "/splash/apple-splash-1170x2532.png",
    media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    href: "/splash/apple-splash-1179x2556.png",
    media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    href: "/splash/apple-splash-1284x2778.png",
    media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    href: "/splash/apple-splash-1290x2796.png",
    media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    href: "/splash/apple-splash-1536x2048.png",
    media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
  {
    href: "/splash/apple-splash-1668x2224.png",
    media: "(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
  {
    href: "/splash/apple-splash-1668x2388.png",
    media: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
  {
    href: "/splash/apple-splash-2048x2732.png",
    media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
] as const;

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
          {APPLE_STARTUP_IMAGES.map((image) => (
            <link
              key={image.href}
              rel="apple-touch-startup-image"
              href={image.href}
              media={image.media}
            />
          ))}
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
          <AppLaunchOverlay />
          <RegisterServiceWorker />
          <Toaster position="top-right" richColors />
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
