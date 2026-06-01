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
