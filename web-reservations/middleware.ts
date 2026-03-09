import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";
import { ROUTES } from "@/lib/constants";

const { auth } = NextAuth(authConfig);

const RESERVED_SEGMENTS = ["super-admin", "login", "api"];

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session;
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const isAgencyAdmin = session?.user?.role === "AGENCY_ADMIN";

  const isSuperAdminRoute = nextUrl.pathname.startsWith(ROUTES.SUPER_ADMIN_BASE);
  const isLoginRoute = nextUrl.pathname === ROUTES.LOGIN;

  // Super-admin route protection
  if (isSuperAdminRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL(ROUTES.LOGIN, nextUrl));
  }

  if (isSuperAdminRoute && isLoggedIn && !isSuperAdmin) {
    return NextResponse.redirect(new URL(ROUTES.LOGIN, nextUrl));
  }

  if (isLoginRoute && isLoggedIn && isSuperAdmin) {
    return NextResponse.redirect(new URL(ROUTES.SUPER_ADMIN_DASHBOARD, nextUrl));
  }

  // Agency route protection
  const parts = nextUrl.pathname.split("/").filter(Boolean);
  const isAgencyRoute =
    parts.length >= 1 && !RESERVED_SEGMENTS.includes(parts[0]);

  if (isAgencyRoute) {
    const slug = parts[0];
    const isAgencyLoginPath = nextUrl.pathname === `/${slug}/login`;

    if (isAgencyLoginPath) {
      // If already logged in as AGENCY_ADMIN, redirect to dashboard
      if (isLoggedIn && isAgencyAdmin) {
        return NextResponse.redirect(new URL(ROUTES.agencyDashboard(slug), nextUrl));
      }
    } else {
      // Protected agency routes (not login)
      if (!isLoggedIn) {
        return NextResponse.redirect(new URL(ROUTES.agencyLogin(slug), nextUrl));
      }
      if (!isAgencyAdmin) {
        return NextResponse.redirect(new URL(ROUTES.agencyLogin(slug), nextUrl));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
