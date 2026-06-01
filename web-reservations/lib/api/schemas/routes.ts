import { z } from "zod";
import { cuidSchema } from "./cuid";

const originSchema = z
  .string()
  .min(2, "El origen debe tener al menos 2 caracteres");
const destinationSchema = z
  .string()
  .min(2, "El destino debe tener al menos 2 caracteres");

const priceSchema = z.number().nonnegative("El precio no puede ser negativo");

export const createRouteSchema = z.object({
  origin: originSchema,
  destination: destinationSchema,
  branchId: cuidSchema,
  directPriceAmount: priceSchema,
  incomingAgencyPriceAmount: priceSchema,
  outgoingCommissionAmount: priceSchema,
  minPrice: priceSchema,
});

export const updateRouteSchema = z.object({
  origin: originSchema.optional(),
  destination: destinationSchema.optional(),
  branchId: cuidSchema.optional(),
  directPriceAmount: priceSchema.optional(),
  incomingAgencyPriceAmount: priceSchema.optional(),
  outgoingCommissionAmount: priceSchema.optional(),
  minPrice: priceSchema.optional(),
});

export type CreateRouteInput = z.infer<typeof createRouteSchema>;
export type UpdateRouteInput = z.infer<typeof updateRouteSchema>;
