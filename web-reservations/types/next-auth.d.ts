declare module "next-auth" {
  interface User {
    role: string;
    branchId: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      branchId: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    branchId: string | null;
  }
}
