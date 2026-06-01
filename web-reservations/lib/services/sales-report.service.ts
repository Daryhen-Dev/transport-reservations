import { prisma } from "@/lib/db";

type ChannelKey = "DIRECT" | "FROM_AGENCY" | "TO_AGENCY";

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
    suggestedAmount: number;
    delta: number; // sum(price - suggested)
  };
  byChannel: Array<{
    channel: ChannelKey;
    reservationCount: number;
    seatCount: number;
    revenueAmount: number;
  }>;
  byAgency: Array<{
    agencyId: string;
    agencyName: string;
    reservationCount: number;
    seatCount: number;
    revenueAmount: number;
  }>;
  byRoute: Array<{
    routeId: string;
    label: string;
    reservationCount: number;
    seatCount: number;
    revenueAmount: number;
  }>;
};

function agencyDisplay(p: {
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
}): string {
  const name =
    p.companyName ?? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
  return name === "" ? "—" : name;
}

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
      priceAmount: true,
      suggestedAmount: true,
      salesChannel: true,
      externalAgencyId: true,
      externalAgency: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
        },
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
    suggestedAmount: 0,
    delta: 0,
  };

  const channelMap = new Map<
    ChannelKey,
    { reservationCount: number; seatCount: number; revenueAmount: number }
  >();
  const agencyMap = new Map<
    string,
    {
      agencyId: string;
      agencyName: string;
      reservationCount: number;
      seatCount: number;
      revenueAmount: number;
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

  for (const r of rows) {
    const price = Number(r.priceAmount.toString());
    const suggested = Number(r.suggestedAmount.toString());
    totals.seatCount += r.seatCount;
    totals.revenueAmount += price * r.seatCount;
    totals.suggestedAmount += suggested * r.seatCount;
    totals.delta += (price - suggested) * r.seatCount;

    const channel = r.salesChannel as ChannelKey;
    const c = channelMap.get(channel) ?? {
      reservationCount: 0,
      seatCount: 0,
      revenueAmount: 0,
    };
    c.reservationCount += 1;
    c.seatCount += r.seatCount;
    c.revenueAmount += price * r.seatCount;
    channelMap.set(channel, c);

    if (r.externalAgencyId && r.externalAgency) {
      const a = agencyMap.get(r.externalAgencyId) ?? {
        agencyId: r.externalAgencyId,
        agencyName: agencyDisplay(r.externalAgency),
        reservationCount: 0,
        seatCount: 0,
        revenueAmount: 0,
      };
      a.reservationCount += 1;
      a.seatCount += r.seatCount;
      a.revenueAmount += price * r.seatCount;
      agencyMap.set(r.externalAgencyId, a);
    }

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
    byChannel: (["DIRECT", "FROM_AGENCY", "TO_AGENCY"] as const).map(
      (channel) => ({
        channel,
        reservationCount: channelMap.get(channel)?.reservationCount ?? 0,
        seatCount: channelMap.get(channel)?.seatCount ?? 0,
        revenueAmount: channelMap.get(channel)?.revenueAmount ?? 0,
      })
    ),
    byAgency: Array.from(agencyMap.values()).sort(
      (a, b) => b.revenueAmount - a.revenueAmount
    ),
    byRoute: Array.from(routeMap.values()).sort(
      (a, b) => b.revenueAmount - a.revenueAmount
    ),
  };
}
