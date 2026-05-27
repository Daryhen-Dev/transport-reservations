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
const phoneSchema = z.string().optional().or(z.literal(""));
const birthDateSchema = z.string().optional().or(z.literal(""));
const optionalString = z.string().optional().or(z.literal(""));

// Discriminator: presence of companyName implies EMPRESA, otherwise PERSONA.
// The current sheet does not require all empresa-specific fields (taxId/contactName),
// so we keep them optional to match the existing Prisma model + UI behavior.
export const createProveedorSchema = z
  .object({
    proveedorTypeId: proveedorTypeIdSchema,

    // PERSONA fields
    firstName: optionalString,
    lastName: optionalString,
    countryId: optionalString,
    birthDate: birthDateSchema,

    // EMPRESA fields
    companyName: optionalString,
    taxId: optionalString,
    contactName: optionalString,

    // Shared
    documentTypeId: documentTypeIdSchema,
    documentNumber: documentNumberSchema,
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
  phone: phoneSchema,
});

export type CreateProveedorInput = z.infer<typeof createProveedorSchema>;
export type UpdateProveedorInput = z.infer<typeof updateProveedorSchema>;
