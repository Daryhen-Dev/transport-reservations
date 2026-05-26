import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const path = nextUrl.pathname;
  const isLogin = path === "/login";
  const isPublicApi =
    path === "/api/v1/auth/login" || path === "/api/v1/auth/refresh";

  if (isLogin && session) {
    return NextResponse.redirect(new URL("/calendario", nextUrl));
  }
  if (isLogin || isPublicApi) return NextResponse.next();

  // All other /api/v1/* paths self-gate inside the handler (so Bearer works).
  if (path.startsWith("/api/v1/")) return NextResponse.next();

  if (!session) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
