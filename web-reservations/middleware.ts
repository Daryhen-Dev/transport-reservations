import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";
import { ROUTES } from "@/lib/constants";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session;
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const isSuperAdminRoute = nextUrl.pathname.startsWith(ROUTES.SUPER_ADMIN_BASE);
  const isLoginRoute = nextUrl.pathname === ROUTES.LOGIN;

  if (isSuperAdminRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL(ROUTES.LOGIN, nextUrl));
  }

  if (isSuperAdminRoute && isLoggedIn && !isSuperAdmin) {
    return NextResponse.redirect(new URL(ROUTES.LOGIN, nextUrl));
  }

  if (isLoginRoute && isLoggedIn && isSuperAdmin) {
    return NextResponse.redirect(new URL(ROUTES.SUPER_ADMIN_DASHBOARD, nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
