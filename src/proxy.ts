import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/forgot-password(.*)",
    "/offline(.*)",
    "/api/push/latest-by-subscription(.*)", // Service worker background fetch must work without Clerk session
    "/api/uploadthing(.*)", // UploadThing webhooks/callbacks
    "/api/webhooks(.*)", // Clerk webhooks
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
    // 1. Admin Route Protection
    if (isAdminRoute(req)) {
        await auth.protect();

        // Dynamic roles are handled in the application layer (ensureRole / checkAccess).
        // We pass the current path as a header to allow server components to check access.
    }

    // 2. Redirect Authenticated Users from Public Auth Routes
    // This fixes the "You are already signed in" error on mobile
    if (isPublicRoute(req)) {
        const { userId } = await auth();
        const { pathname } = req.nextUrl;

        if (userId && (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up"))) {
            const url = new URL("/dashboard", req.url);
            return Response.redirect(url);
        }
    }

    // 3. Protected Routes (Everything else not public)
    if (!isPublicRoute(req)) {
        await auth.protect();
    }

    // Pass current path in headers for server components
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-current-path", req.nextUrl.pathname);

    // Use NextResponse.next to pass headers, but clerkMiddleware expects void or Response? 
    // Clerk docs say you can return a Response. 
    // We need to import NextResponse.
    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
