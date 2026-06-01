import { prisma } from "@/lib/db";

type RoutePricing = {
  directPriceAmount: { toString(): string };
  incomingAgencyPriceAmount: { toString(): string };
  outgoingCommissionAmount: { toString(): string };
  minPrice: { toString(): string };
};

export type ResolvedTariff = {
  directPriceAmount: number;
  incomingAgencyPriceAmount: number;
  outgoingCommissionAmount: number;
  minPrice: number;
};

/**
 * Resolves the effective tariff for (proveedor, route) — a ProveedorTariff
 * override takes precedence column-by-column over the Route defaults.
 */
export async function resolveTariff(
  proveedorId: string,
  routeId: string,
  routePricing: RoutePricing
): Promise<ResolvedTariff> {
  const override = await prisma.proveedorTariff.findUnique({
    where: { proveedorId_routeId: { proveedorId, routeId } },
    select: {
      directPriceAmount: true,
      incomingAgencyPriceAmount: true,
      outgoingCommissionAmount: true,
      minPrice: true,
      isActive: true,
    },
  });

  const active = override?.isActive ?? false;

  return {
    directPriceAmount: Number(
      (active && override?.directPriceAmount
        ? override.directPriceAmount
        : routePricing.directPriceAmount
      ).toString()
    ),
    incomingAgencyPriceAmount: Number(
      (active && override?.incomingAgencyPriceAmount
        ? override.incomingAgencyPriceAmount
        : routePricing.incomingAgencyPriceAmount
      ).toString()
    ),
    outgoingCommissionAmount: Number(
      (active && override?.outgoingCommissionAmount
        ? override.outgoingCommissionAmount
        : routePricing.outgoingCommissionAmount
      ).toString()
    ),
    minPrice: Number(
      (active && override?.minPrice
        ? override.minPrice
        : routePricing.minPrice
      ).toString()
    ),
  };
}

/**
 * Tarifa sugerida según el tipo del proveedor comprador.
 * PERSONA paga tarifa directa; AGENCIA / INSTITUCION_PUBLICA paga la
 * tarifa rebajada para agencias.
 */
export function suggestedForProveedorType(
  proveedorTypeName: string,
  tariff: ResolvedTariff
): number {
  return proveedorTypeName === "AGENCIA" ||
    proveedorTypeName === "INSTITUCION_PUBLICA"
    ? tariff.incomingAgencyPriceAmount
    : tariff.directPriceAmount;
}
