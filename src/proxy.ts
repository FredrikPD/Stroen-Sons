import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/forgot-password(.*)",
  "/api/uploadthing(.*)",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isAdminRoute(req)) {
    await auth.protect();

    // Check custom role in metadata if not using Clerk Orgs
    const { sessionClaims } = await auth();

    // Clerk passes publicMetadata as public_metadata in the JWT
    // @ts-ignore
    const role = sessionClaims?.public_metadata?.role;

    // NOTE: This assumes you have configured the session token to include public_metadata
    if (role !== "ADMIN" && role !== "MODERATOR") {
      const url = new URL("/dashboard", req.url);
      return Response.redirect(url);
    }
  }

  if (isPublicRoute(req)) {
    // Let Clerk handle the public route access
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals + statiske filer
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Kjør alltid for API routes
    "/(api|trpc)(.*)",
  ],
};