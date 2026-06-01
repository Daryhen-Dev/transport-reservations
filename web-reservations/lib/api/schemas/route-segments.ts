import { z } from "zod";
import { cuidSchema } from "./cuid";

const originSchema = z.string().min(2, "Origen requerido");
const destinationSchema = z.string().min(2, "Destino requerido");
const positionSchema = z.number().int().min(1, "Orden debe ser >= 1");
const costSchema = z
  .number()
  .nonnegative("El costo no puede ser negativo")
  .nullable()
  .optional();

export const createRouteSegmentSchema = z.object({
  routeId: cuidSchema,
  position: positionSchema,
  origin: originSchema,
  destination: destinationSchema,
  isExternal: z.boolean().optional(),
  operatorProveedorId: cuidSchema.nullable().optional(),
  externalCostAmount: costSchema,
  notes: z.string().max(500).nullable().optional(),
});

export const updateRouteSegmentSchema = z.object({
  position: positionSchema.optional(),
  origin: originSchema.optional(),
  destination: destinationSchema.optional(),
  isExternal: z.boolean().optional(),
  operatorProveedorId: cuidSchema.nullable().optional(),
  externalCostAmount: costSchema,
  notes: z.string().max(500).nullable().optional(),
});

export type CreateRouteSegmentInput = z.infer<typeof createRouteSegmentSchema>;
export type UpdateRouteSegmentInput = z.infer<typeof updateRouteSegmentSchema>;
