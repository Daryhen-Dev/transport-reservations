import { z } from "zod";
import { cuidSchema } from "./cuid";

const moneyField = z.number().nonnegative("El monto no puede ser negativo");

export const createExternalSaleSchema = z.object({
  branchId: cuidSchema,
  operatorAgencyId: cuidSchema,
  buyerName: z.string().max(120).nullable().optional(),
  buyerDocument: z.string().max(60).nullable().optional(),
  buyerPhone: z.string().max(40).nullable().optional(),
  departureAt: z.string().min(1, "Fecha de viaje requerida"),
  origin: z.string().min(2, "Origen requerido"),
  destination: z.string().min(2, "Destino requerido"),
  passengerCount: z.number().int().min(1, "Mínimo 1 pasajero"),
  priceCharged: moneyField,
  costPaidToOperator: moneyField,
  reservationStatusId: cuidSchema.optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const updateExternalSaleSchema = z.object({
  operatorAgencyId: cuidSchema.optional(),
  buyerName: z.string().max(120).nullable().optional(),
  buyerDocument: z.string().max(60).nullable().optional(),
  buyerPhone: z.string().max(40).nullable().optional(),
  departureAt: z.string().min(1).optional(),
  origin: z.string().min(2).optional(),
  destination: z.string().min(2).optional(),
  passengerCount: z.number().int().min(1).optional(),
  priceCharged: moneyField.optional(),
  costPaidToOperator: moneyField.optional(),
  reservationStatusId: cuidSchema.optional(),
  notes: z.string().max(500).nullable().optional(),
});

export type CreateExternalSaleInput = z.infer<typeof createExternalSaleSchema>;
export type UpdateExternalSaleInput = z.infer<typeof updateExternalSaleSchema>;
