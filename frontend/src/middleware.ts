import { clerkMiddleware } from "@clerk/nextjs/server";

// Simple middleware - just run Clerk auth without blocking
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and API routes (which are proxied to backend)
    "/((?!_next|api|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
