import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/forgot-password(.*)",
    "/api/uploadthing(.*)", // UploadThing webhooks/callbacks
    "/api/webhooks(.*)", // Clerk webhooks
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
    // 1. Admin Route Protection
    if (isAdminRoute(req)) {
        await auth.protect();

        const { sessionClaims } = await auth();
        // @ts-ignore
        const role = sessionClaims?.public_metadata?.role;

        if (role !== "ADMIN" && role !== "MODERATOR") {
            const url = new URL("/dashboard", req.url);
            return Response.redirect(url);
        }
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
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
