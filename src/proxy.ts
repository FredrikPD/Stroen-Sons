import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // DEV BYPASS (remove before deploy)
  if (process.env.NODE_ENV === "development" && process.env.DEV_AUTH_BYPASS === "true") {
    return;
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