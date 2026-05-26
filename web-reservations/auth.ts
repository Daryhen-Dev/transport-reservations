import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        slug: { label: "Slug", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            role: true,
            branch: { select: { slug: true } },
          },
        });

        if (!user) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!passwordMatch) return null;

        // Branch isolation: validate user belongs to the requested slug
        const slug = credentials.slug as string | undefined;
        if (slug) {
          const roleName = user.role.name;

          if (roleName === "SUCURSAL_USER") {
            if (user.branch?.slug !== slug) return null;
          } else if (roleName === "AGENCY_ADMIN") {
            const branch = await prisma.branch.findFirst({
              where: { slug, agencyId: user.agencyId ?? "" },
            });
            if (!branch) return null;
          }
          // SUPER_ADMIN: no restriction
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.name,
        };
      },
    }),
  ],
});
