import { z } from "zod";

const slugSchema = z
  .string()
  .min(2, "El slug debe tener al menos 2 caracteres")
  .regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones");

const nameSchema = z
  .string()
  .min(2, "El nombre debe tener al menos 2 caracteres");

export const createBranchSchema = z.object({
  name: nameSchema,
  slug: slugSchema,
});

export const updateBranchSchema = z.object({
  name: nameSchema.optional(),
  slug: slugSchema.optional(),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
