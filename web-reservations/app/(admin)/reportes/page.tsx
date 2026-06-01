import { requireActiveBranch } from "@/lib/branch-context";
import { getSalesReport } from "@/lib/services/sales-report.service";
import { ReportesClient } from "./_components/reportes-client";

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from: fromParam, to: toParam } = await searchParams;
  const branch = await requireActiveBranch();

  const from = fromParam ? new Date(fromParam) : undefined;
  const to = toParam ? new Date(toParam) : undefined;

  const report = await getSalesReport({
    branchId: branch.id,
    from,
    to,
  });

  // Decimals already serialized to plain numbers by the service.
  return (
    <ReportesClient
      branchId={branch.id}
      initialFrom={fromParam ?? ""}
      initialTo={toParam ?? ""}
      initialReport={report}
    />
  );
}
