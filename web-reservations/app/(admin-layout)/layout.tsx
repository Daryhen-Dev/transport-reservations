import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || session.user?.role !== "SUPER_ADMIN") {
    redirect(ROUTES.LOGIN);
  }

  return <>{children}</>;
}
