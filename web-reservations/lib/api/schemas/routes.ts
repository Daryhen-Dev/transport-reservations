import { z } from "zod";
import { cuidSchema } from "./cuid";

const originSchema = z
  .string()
  .min(2, "El origen debe tener al menos 2 caracteres");
const destinationSchema = z
  .string()
  .min(2, "El destino debe tener al menos 2 caracteres");

export const createRouteSchema = z.object({
  origin: originSchema,
  destination: destinationSchema,
  branchId: cuidSchema,
});

export const updateRouteSchema = z.object({
  origin: originSchema.optional(),
  destination: destinationSchema.optional(),
  branchId: cuidSchema.optional(),
});

export type CreateRouteInput = z.infer<typeof createRouteSchema>;
export type UpdateRouteInput = z.infer<typeof updateRouteSchema>;
