import { z } from "zod";

const nameSchema = z
  .string()
  .min(1, "El nombre es requerido")
  .transform((s) => s.toUpperCase());

export const createTripStatusSchema = z.object({
  name: nameSchema,
});

export const updateTripStatusSchema = z.object({
  name: nameSchema.optional(),
});

export type CreateTripStatusInput = z.infer<typeof createTripStatusSchema>;
export type UpdateTripStatusInput = z.infer<typeof updateTripStatusSchema>;
