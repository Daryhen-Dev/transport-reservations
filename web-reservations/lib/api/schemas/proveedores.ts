import { z } from "zod";

const proveedorTypeIdSchema = z
  .string()
  .min(1, "Tipo de proveedor requerido");
const documentTypeIdSchema = z
  .string()
  .min(1, "Tipo de documento requerido");
const documentNumberSchema = z
  .string()
  .min(1, "Número de documento requerido");
const emailSchema = z.string().email("Email inválido");
const phoneSchema = z.string().optional().or(z.literal(""));
const birthDateSchema = z.string().optional().or(z.literal(""));
const optionalString = z.string().optional().or(z.literal(""));

// PERSONA usa firstName/lastName. AGENCIA / INSTITUCION_PUBLICA usan
// companyName (+ taxId / contactName opcionales). Mantenemos todos los
// campos opcionales y validamos via refine que al menos uno este informado.
export const createProveedorSchema = z
  .object({
    proveedorTypeId: proveedorTypeIdSchema,

    // PERSONA fields
    firstName: optionalString,
    lastName: optionalString,
    countryId: optionalString,
    birthDate: birthDateSchema,

    // Campos para AGENCIA / INSTITUCION_PUBLICA
    companyName: optionalString,
    taxId: optionalString,
    contactName: optionalString,

    // Shared
    documentTypeId: documentTypeIdSchema,
    documentNumber: documentNumberSchema,
    email: emailSchema,
    phone: phoneSchema,
  })
  .refine(
    (data) => {
      const hasPersonaName =
        (data.firstName && data.firstName.length > 0) ||
        (data.lastName && data.lastName.length > 0);
      const hasCompanyName = data.companyName && data.companyName.length > 0;
      return hasPersonaName || hasCompanyName;
    },
    {
      message: "Debe informar nombre/apellido (persona) o nombre de empresa",
      path: ["firstName"],
    }
  );

export const updateProveedorSchema = z.object({
  proveedorTypeId: proveedorTypeIdSchema.optional(),

  firstName: optionalString,
  lastName: optionalString,
  countryId: optionalString,
  birthDate: birthDateSchema,

  companyName: optionalString,
  taxId: optionalString,
  contactName: optionalString,

  documentTypeId: documentTypeIdSchema.optional(),
  documentNumber: documentNumberSchema.optional(),
  email: emailSchema.optional(),
  phone: phoneSchema,
});

export type CreateProveedorInput = z.infer<typeof createProveedorSchema>;
export type UpdateProveedorInput = z.infer<typeof updateProveedorSchema>;
