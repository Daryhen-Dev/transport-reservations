import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session;
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const isSuperAdminRoute = nextUrl.pathname.startsWith("/super-admin");
  const isLoginRoute = nextUrl.pathname === "/login";

  if (isSuperAdminRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isSuperAdminRoute && isLoggedIn && !isSuperAdmin) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isLoginRoute && isLoggedIn && isSuperAdmin) {
    return NextResponse.redirect(new URL("/super-admin/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
