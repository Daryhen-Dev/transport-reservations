import { z } from "zod";

const nameSchema = z.string().min(2, "El nombre debe tener al menos 2 caracteres");
const emailSchema = z.string().email("Email inválido");
const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres");
const branchIdSchema = z.string().cuid("Sucursal inválida");

export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  branchId: branchIdSchema,
});

export const updateUserSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
  branchId: branchIdSchema.optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
