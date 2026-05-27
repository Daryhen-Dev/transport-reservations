import { z } from "zod";

const firstNameSchema = z.string().min(1, "El nombre es requerido");
const lastNameSchema = z.string().min(1, "El apellido es requerido");
const documentTypeIdSchema = z
  .string()
  .min(1, "El tipo de documento es requerido");
const documentNumberSchema = z
  .string()
  .min(1, "El número de documento es requerido");
const countryIdSchema = z.string().min(1, "El país es requerido");
const phoneSchema = z.string().optional().or(z.literal(""));
const birthDateSchema = z.string().optional().or(z.literal(""));

export const createPassengerSchema = z.object({
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  documentTypeId: documentTypeIdSchema,
  documentNumber: documentNumberSchema,
  countryId: countryIdSchema,
  phone: phoneSchema,
  birthDate: birthDateSchema,
});

export const updatePassengerSchema = z.object({
  firstName: firstNameSchema.optional(),
  lastName: lastNameSchema.optional(),
  documentTypeId: documentTypeIdSchema.optional(),
  documentNumber: documentNumberSchema.optional(),
  countryId: countryIdSchema.optional(),
  phone: phoneSchema,
  birthDate: birthDateSchema,
});

export type CreatePassengerInput = z.infer<typeof createPassengerSchema>;
export type UpdatePassengerInput = z.infer<typeof updatePassengerSchema>;
