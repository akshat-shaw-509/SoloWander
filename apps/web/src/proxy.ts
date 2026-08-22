import { applySessionResponse, updateSession } from "@/lib/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

const authRoutes = new Set(["/login", "/register"]);

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isDashboardRoute =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isAuthRoute = authRoutes.has(pathname);

  const { response, user } = await updateSession(request);

  if (!user && isDashboardRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectedFrom", pathname);

    return applySessionResponse(
      response,
      NextResponse.redirect(redirectUrl),
    );
  }

  if (user && isAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";

    return applySessionResponse(
      response,
      NextResponse.redirect(redirectUrl),
    );
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
