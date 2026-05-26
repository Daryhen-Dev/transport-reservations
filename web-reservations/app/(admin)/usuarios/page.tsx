import { auth } from "@/auth";
import { notFound } from "next/navigation";
import { getAllUsers } from "@/lib/services/user.service";
import { getBranches } from "@/lib/services/branch.service";
import { UsersTable } from "./_components/users-table";

export default async function UsuariosPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "OWNER") notFound();

  const [users, branches] = await Promise.all([getAllUsers(), getBranches()]);

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <UsersTable data={users} branches={branches} />
    </div>
  );
}
