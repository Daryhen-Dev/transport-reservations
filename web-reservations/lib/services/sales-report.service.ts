import { prisma } from "@/lib/db";
import type { PriceType } from "@/lib/pricing";

export type SalesReportFilters = {
  branchId?: string;
  from?: Date;
  to?: Date;
};

export type SalesReport = {
  totals: {
    reservationCount: number;
    seatCount: number;
    revenueAmount: number;
    commissionAmount: number;
    transferCommissionAmount: number;
  };
  byProveedorType: Array<{
    proveedorTypeName: string;
    reservationCount: number;
    seatCount: number;
    revenueAmount: number;
  }>;
  byPriceType: Array<{
    priceType: PriceType;
    reservationCount: number;
    seatCount: number;
    revenueAmount: number;
    commissionAmount: number;
  }>;
  byTransferAgency: Array<{
    agencyId: string;
    agencyName: string;
    reservationCount: number;
    seatCount: number;
    amountSentToAgency: number;
    commissionEarned: number;
  }>;
  byRoute: Array<{
    routeId: string;
    label: string;
    reservationCount: number;
    seatCount: number;
    revenueAmount: number;
  }>;
};

export async function getSalesReport(
  filters: SalesReportFilters
): Promise<SalesReport> {
  const where = {
    reservationStatus: { name: { not: "CANCELADA" } },
    ...(filters.branchId ? { trip: { branchId: filters.branchId } } : {}),
    ...(filters.from || filters.to
      ? {
          trip: {
            ...(filters.branchId ? { branchId: filters.branchId } : {}),
            departureAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          },
        }
      : {}),
  };

  const rows = await prisma.passengerReservation.findMany({
    where,
    select: {
      id: true,
      seatCount: true,
      priceType: true,
      priceAmount: true,
      commissionAmount: true,
      transferredToAgencyId: true,
      transferredToAgency: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
        },
      },
      transferAmountToAgency: true,
      transferCommissionAmount: true,
      reservationStatus: { select: { name: true } },
      proveedor: {
        select: { proveedorType: { select: { name: true } } },
      },
      trip: {
        select: {
          route: { select: { id: true, origin: true, destination: true } },
        },
      },
    },
  });

  const totals = {
    reservationCount: rows.length,
    seatCount: 0,
    revenueAmount: 0,
    commissionAmount: 0,
    transferCommissionAmount: 0,
  };

  const typeMap = new Map<
    string,
    { reservationCount: number; seatCount: number; revenueAmount: number }
  >();
  const priceTypeMap = new Map<
    PriceType,
    {
      priceType: PriceType;
      reservationCount: number;
      seatCount: number;
      revenueAmount: number;
      commissionAmount: number;
    }
  >();
  const routeMap = new Map<
    string,
    {
      routeId: string;
      label: string;
      reservationCount: number;
      seatCount: number;
      revenueAmount: number;
    }
  >();
  const transferAgencyMap = new Map<
    string,
    {
      agencyId: string;
      agencyName: string;
      reservationCount: number;
      seatCount: number;
      amountSentToAgency: number;
      commissionEarned: number;
    }
  >();

  for (const r of rows) {
    const price = Number(r.priceAmount.toString());
    const commission = r.commissionAmount
      ? Number(r.commissionAmount.toString())
      : 0;
    const transferCommission = r.transferCommissionAmount
      ? Number(r.transferCommissionAmount.toString())
      : 0;
    const transferToAgency = r.transferAmountToAgency
      ? Number(r.transferAmountToAgency.toString())
      : 0;
    totals.seatCount += r.seatCount;
    totals.revenueAmount += price * r.seatCount;
    totals.commissionAmount += commission;
    totals.transferCommissionAmount += transferCommission;

    if (r.transferredToAgencyId && r.transferredToAgency) {
      const a = r.transferredToAgency;
      const name =
        a.companyName ?? `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim() ?? "—";
      const bucket = transferAgencyMap.get(r.transferredToAgencyId) ?? {
        agencyId: r.transferredToAgencyId,
        agencyName: name === "" ? "—" : name,
        reservationCount: 0,
        seatCount: 0,
        amountSentToAgency: 0,
        commissionEarned: 0,
      };
      bucket.reservationCount += 1;
      bucket.seatCount += r.seatCount;
      bucket.amountSentToAgency += transferToAgency;
      bucket.commissionEarned += transferCommission;
      transferAgencyMap.set(r.transferredToAgencyId, bucket);
    }

    const typeName = r.proveedor.proveedorType.name;
    const t = typeMap.get(typeName) ?? {
      reservationCount: 0,
      seatCount: 0,
      revenueAmount: 0,
    };
    t.reservationCount += 1;
    t.seatCount += r.seatCount;
    t.revenueAmount += price * r.seatCount;
    typeMap.set(typeName, t);

    const pt = r.priceType as PriceType;
    const ptBucket = priceTypeMap.get(pt) ?? {
      priceType: pt,
      reservationCount: 0,
      seatCount: 0,
      revenueAmount: 0,
      commissionAmount: 0,
    };
    ptBucket.reservationCount += 1;
    ptBucket.seatCount += r.seatCount;
    ptBucket.revenueAmount += price * r.seatCount;
    ptBucket.commissionAmount += commission;
    priceTypeMap.set(pt, ptBucket);

    const route = r.trip.route;
    const rk = routeMap.get(route.id) ?? {
      routeId: route.id,
      label: `${route.origin} → ${route.destination}`,
      reservationCount: 0,
      seatCount: 0,
      revenueAmount: 0,
    };
    rk.reservationCount += 1;
    rk.seatCount += r.seatCount;
    rk.revenueAmount += price * r.seatCount;
    routeMap.set(route.id, rk);
  }

  return {
    totals,
    byProveedorType: Array.from(typeMap.entries())
      .map(([proveedorTypeName, v]) => ({ proveedorTypeName, ...v }))
      .sort((a, b) => b.revenueAmount - a.revenueAmount),
    byPriceType: Array.from(priceTypeMap.values()).sort(
      (a, b) => b.revenueAmount - a.revenueAmount
    ),
    byTransferAgency: Array.from(transferAgencyMap.values()).sort(
      (a, b) => b.commissionEarned - a.commissionEarned
    ),
    byRoute: Array.from(routeMap.values()).sort(
      (a, b) => b.revenueAmount - a.revenueAmount
    ),
  };
}
