import { auth } from "@/auth";
import { notFound } from "next/navigation";
import { getBranches } from "@/lib/services/branch.service";
import { BranchesTable } from "./_components/branches-table";

export default async function SucursalesPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "OWNER") notFound();

  const branches = await getBranches();

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <BranchesTable data={branches} />
    </div>
  );
}
