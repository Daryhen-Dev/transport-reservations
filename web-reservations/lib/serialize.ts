/**
 * Helpers para convertir Decimals de Prisma a strings antes de pasar objetos
 * de Server Components a Client Components. Next.js rechaza Decimals porque
 * no son plain objects serializables.
 */

type DecimalLike = { toString(): string } | null | undefined;

function decToString(v: DecimalLike): string | null {
  if (v === null || v === undefined) return null;
  return v.toString();
}

type RouteShape = {
  directPriceAmount?: DecimalLike;
  incomingAgencyPriceAmount?: DecimalLike;
  outgoingCommissionAmount?: DecimalLike;
  minPrice?: DecimalLike;
};

type WithSerializedPrices<R> = Omit<
  R,
  | "directPriceAmount"
  | "incomingAgencyPriceAmount"
  | "outgoingCommissionAmount"
  | "minPrice"
> & {
  directPriceAmount: string | null;
  incomingAgencyPriceAmount: string | null;
  outgoingCommissionAmount: string | null;
  minPrice: string | null;
};

export function serializeRoute<R extends RouteShape>(
  r: R
): WithSerializedPrices<R> {
  return {
    ...r,
    directPriceAmount: decToString(r.directPriceAmount),
    incomingAgencyPriceAmount: decToString(r.incomingAgencyPriceAmount),
    outgoingCommissionAmount: decToString(r.outgoingCommissionAmount),
    minPrice: decToString(r.minPrice),
  };
}

export function serializeTrip<T extends { route: RouteShape }>(
  t: T
): Omit<T, "route"> & { route: WithSerializedPrices<T["route"]> } {
  return {
    ...t,
    route: serializeRoute(t.route),
  };
}

// Las reservas (passenger/cargo) embeben Decimals en top-level. El `trip`
// asociado puede o no traer la Route con sus tarifas (Decimals) — depende
// del select del service. Los helpers normalizan ambos casos.

function maybeSerializeRoute(route: unknown): unknown {
  if (!route || typeof route !== "object") return route;
  const r = route as RouteShape;
  // Solo aplica serializeRoute si la route trae alguno de los Decimals.
  if (
    r.directPriceAmount === undefined &&
    r.incomingAgencyPriceAmount === undefined &&
    r.outgoingCommissionAmount === undefined &&
    r.minPrice === undefined
  ) {
    return route;
  }
  return serializeRoute(r);
}

function maybeSerializeTrip(trip: unknown): unknown {
  if (!trip || typeof trip !== "object") return trip;
  const t = trip as { route?: unknown };
  if (t.route === undefined) return trip;
  return { ...t, route: maybeSerializeRoute(t.route) };
}

export function serializePassengerReservation<
  R extends {
    priceAmount?: DecimalLike;
    suggestedAmount?: DecimalLike;
    commissionAmount?: DecimalLike;
    trip?: unknown;
  },
>(r: R) {
  return {
    ...r,
    priceAmount: decToString(r.priceAmount),
    suggestedAmount: decToString(r.suggestedAmount),
    commissionAmount: decToString(r.commissionAmount),
    trip: maybeSerializeTrip(r.trip),
  };
}

export function serializeCargoReservation<
  R extends { priceAmount?: DecimalLike; trip?: unknown },
>(r: R) {
  return {
    ...r,
    priceAmount: decToString(r.priceAmount),
    trip: maybeSerializeTrip(r.trip),
  };
}
