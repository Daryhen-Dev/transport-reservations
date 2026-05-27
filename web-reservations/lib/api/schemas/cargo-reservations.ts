import { z } from "zod";
import { cuidSchema } from "./cuid";

// Discriminated proveedor used in the full create form (sheet variant).
const personaProveedorSchema = z.object({
  customerType: z.literal("PERSONA"),
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  documentTypeId: cuidSchema,
  documentNumber: z.string().min(1, "El número de documento es requerido"),
  countryId: cuidSchema,
  birthDate: z.string().optional(),
});

const empresaProveedorSchema = z.object({
  customerType: z.literal("EMPRESA"),
  companyName: z.string().min(1, "El nombre de la empresa es requerido"),
  taxId: z.string().min(1, "El RIF/NIT es requerido"),
  contactName: z.string().optional(),
});

export const proveedorInputSchema = z.discriminatedUnion("customerType", [
  personaProveedorSchema,
  empresaProveedorSchema,
]);

export const destinatarioInputSchema = z.object({
  firstName: z.string().min(1, "El nombre del destinatario es requerido"),
  lastName: z.string().min(1, "El apellido del destinatario es requerido"),
  phone: z.string().optional(),
  documentTypeId: z.string().optional(),
  documentNumber: z.string().optional(),
});

// Full create variant: inline proveedor + destinatario, explicit trip selection.
export const createCargoReservationSchema = z.object({
  tripId: cuidSchema,
  weightKg: z.number().positive("El peso debe ser mayor a 0"),
  diameterCm: z.number().positive().optional(),
  widthCm: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  lengthCm: z.number().positive().optional(),
  categoriaId: cuidSchema.optional(),
  description: z.string().optional(),
  destinationBranchId: cuidSchema.optional(),
  externalDestination: z.string().optional(),
  destinatario: destinatarioInputSchema,
  proveedor: proveedorInputSchema,
  proveedorTypeId: cuidSchema,
  reservationStatusId: cuidSchema,
});

// Quick create variant (used from the calendar "nueva encomienda" flow):
// existing proveedorId, inline destinatario, auto-create the trip if it
// does not already exist for the chosen schedule+date.
export const createQuickCargoReservationSchema = z.object({
  scheduleId: cuidSchema,
  date: z.string().min(1, "La fecha es requerida"),
  branchId: cuidSchema,
  proveedorId: cuidSchema,
  categoriaId: cuidSchema.optional(),
  destinatario: destinatarioInputSchema,
  description: z.string().optional(),
  weightKg: z.number().positive("El peso debe ser mayor a 0"),
  destinationBranchId: cuidSchema.optional(),
  externalDestination: z.string().optional(),
  diameterCm: z.number().positive().optional(),
  widthCm: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  lengthCm: z.number().positive().optional(),
});

export const updateReservationStatusSchema = z.object({
  reservationStatusId: cuidSchema,
});

export const updateCargoStatusSchema = z.object({
  cargoStatusId: cuidSchema,
});

export const updateCargoReservationSchema = z.object({
  categoriaId: cuidSchema.nullable().optional(),
  description: z.string().nullable().optional(),
  weightKg: z.number().positive().optional(),
  destinationBranchId: cuidSchema.nullable().optional(),
  externalDestination: z.string().nullable().optional(),
  diameterCm: z.number().positive().nullable().optional(),
  widthCm: z.number().positive().nullable().optional(),
  heightCm: z.number().positive().nullable().optional(),
  lengthCm: z.number().positive().nullable().optional(),
});

export type CreateCargoReservationInput = z.infer<
  typeof createCargoReservationSchema
>;
export type CreateQuickCargoReservationInput = z.infer<
  typeof createQuickCargoReservationSchema
>;
export type UpdateReservationStatusInput = z.infer<
  typeof updateReservationStatusSchema
>;
export type UpdateCargoStatusInput = z.infer<typeof updateCargoStatusSchema>;
export type UpdateCargoReservationInput = z.infer<
  typeof updateCargoReservationSchema
>;
