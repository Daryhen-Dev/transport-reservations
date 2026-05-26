// NOTE: We deliberately avoid `import type { NextAuthConfig } from "next-auth"`
// because Next-Auth v5 beta's d.ts re-exports break TS's `bundler` resolution
// with `"type":"module"` (TS2305). Inline the callback parameter types instead.

import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

type CallbackUser = {
  id: string;
  role: string;
  branchId: string | null;
};

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }: { token: JWT; user?: unknown }) {
      if (user) {
        const u = user as Partial<CallbackUser>;
        if (u.id) token.id = u.id;
        if (u.role) token.role = u.role;
        token.branchId = u.branchId ?? null;
      }
      return token;
    },
    session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.branchId = (token.branchId as string | null) ?? null;
      }
      return session;
    },
  },
  providers: [],
};
