import { getRoutes } from "@/lib/services/route.service";
import { getBranches } from "@/lib/services/branch.service";
import { RoutesTable } from "./_components/routes-table";

export default async function RutasPage() {
  const [routes, branches] = await Promise.all([
    getRoutes(),
    getBranches(),
  ]);

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <RoutesTable data={routes} branches={branches} />
    </div>
  );
}
