import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAuthBypassed } from "@/lib/auth";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",
  "/legal(.*)",
]);

/** Reachable by a signed-in user who has no organization yet. */
const isActivationRoute = createRouteMatcher([
  "/activate(.*)",
  "/api/activate",
  "/api/demo/request",
]);

function bypassMiddleware() {
  return NextResponse.next();
}

export default isAuthBypassed()
  ? bypassMiddleware
  : clerkMiddleware(async (auth, request) => {
      if (isPublicRoute(request)) return;
      await auth.protect();
      // Signed in but no active organization: send pages to the activation gate
      // (API routes keep answering 403 "No active organization").
      const { orgId } = await auth();
      if (
        !orgId &&
        !isActivationRoute(request) &&
        !request.nextUrl.pathname.startsWith("/api/")
      ) {
        return NextResponse.redirect(new URL("/activate", request.url));
      }
    });

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
