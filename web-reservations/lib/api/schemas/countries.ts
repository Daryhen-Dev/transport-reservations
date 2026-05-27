import { z } from "zod";

const nameSchema = z
  .string()
  .min(2, "El nombre debe tener al menos 2 caracteres");
const nationalitySchema = z
  .string()
  .min(2, "La nacionalidad debe tener al menos 2 caracteres");
const codeSchema = z
  .string()
  .length(2, "El código debe tener exactamente 2 letras")
  .regex(/^[A-Z]{2}$/, "Solo letras mayúsculas (ej: VE, CO)");

export const createCountrySchema = z.object({
  name: nameSchema,
  nationality: nationalitySchema,
  code: codeSchema.optional().or(z.literal("")),
});

export const updateCountrySchema = z.object({
  name: nameSchema.optional(),
  nationality: nationalitySchema.optional(),
  code: codeSchema.optional().or(z.literal("")),
});

export type CreateCountryInput = z.infer<typeof createCountrySchema>;
export type UpdateCountryInput = z.infer<typeof updateCountrySchema>;
