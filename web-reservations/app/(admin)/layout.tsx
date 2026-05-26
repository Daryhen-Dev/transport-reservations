import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";

export default async function AgencyAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  const role = session?.user?.role;
  const isAllowed = role === "AGENCY_ADMIN" || role === "SUCURSAL_USER";
  if (!session || !isAllowed) {
    redirect(ROUTES.agencyLogin(slug));
  }

  return <>{children}</>;
}
