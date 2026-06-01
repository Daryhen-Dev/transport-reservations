import { z } from "zod";
import { cuidSchema } from "./cuid";

const priceField = z
  .number()
  .nonnegative("El precio no puede ser negativo")
  .nullable()
  .optional();

export const createProveedorTariffSchema = z.object({
  proveedorId: cuidSchema,
  routeId: cuidSchema,
  directPriceAmount: priceField,
  incomingAgencyPriceAmount: priceField,
  outgoingCommissionAmount: priceField,
  minPrice: priceField,
  notes: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateProveedorTariffSchema = z.object({
  directPriceAmount: priceField,
  incomingAgencyPriceAmount: priceField,
  outgoingCommissionAmount: priceField,
  minPrice: priceField,
  notes: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateProveedorTariffInput = z.infer<
  typeof createProveedorTariffSchema
>;
export type UpdateProveedorTariffInput = z.infer<
  typeof updateProveedorTariffSchema
>;
