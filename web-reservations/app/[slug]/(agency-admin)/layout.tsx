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

  if (!session || session.user?.role !== "AGENCY_ADMIN") {
    redirect(ROUTES.agencyLogin(slug));
  }

  return <>{children}</>;
}
