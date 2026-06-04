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

export function serializePassengerReservation<
  R extends {
    priceAmount?: DecimalLike;
    commissionAmount?: DecimalLike;
    transferAmountToAgency?: DecimalLike;
    transferCommissionAmount?: DecimalLike;
  },
>(r: R) {
  return {
    ...r,
    priceAmount: decToString(r.priceAmount),
    commissionAmount: decToString(r.commissionAmount),
    transferAmountToAgency: decToString(r.transferAmountToAgency),
    transferCommissionAmount: decToString(r.transferCommissionAmount),
  };
}

export function serializeCargoReservation<
  R extends { priceAmount?: DecimalLike },
>(r: R) {
  return {
    ...r,
    priceAmount: decToString(r.priceAmount),
  };
}
