import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAuthBypassed } from "@/lib/auth";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",
  "/legal(.*)",
]);

function bypassMiddleware() {
  return NextResponse.next();
}

export default isAuthBypassed()
  ? bypassMiddleware
  : clerkMiddleware(async (auth, request) => {
      if (!isPublicRoute(request)) {
        await auth.protect();
      }
    });

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
