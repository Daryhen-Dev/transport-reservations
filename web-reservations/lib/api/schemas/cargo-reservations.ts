import { z } from "zod";
import { cuidSchema } from "./cuid";

// Inline proveedor — solo PERSONA. Para AGENCIA / INSTITUCION_PUBLICA, el
// proveedor se crea desde /proveedores y se referencia via proveedorId en
// el flujo quick.
export const proveedorInputSchema = z.object({
  customerType: z.literal("PERSONA"),
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  documentTypeId: cuidSchema,
  documentNumber: z.string().min(1, "El número de documento es requerido"),
  countryId: cuidSchema,
  birthDate: z.string().optional(),
});

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
  priceAmount: z.number().positive("El precio debe ser mayor a 0"),
  cobrarEnDestino: z.boolean().optional(),
  categoriaId: cuidSchema,
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
  categoriaId: cuidSchema,
  destinatario: destinatarioInputSchema,
  description: z.string().optional(),
  weightKg: z.number().positive("El peso debe ser mayor a 0"),
  priceAmount: z.number().positive("El precio debe ser mayor a 0"),
  cobrarEnDestino: z.boolean().optional(),
  destinationBranchId: cuidSchema.optional(),
  externalDestination: z.string().optional(),
});

export const updateReservationStatusSchema = z.object({
  reservationStatusId: cuidSchema,
});

export const updateCargoStatusSchema = z.object({
  cargoStatusId: cuidSchema,
});

export const updateCargoReservationSchema = z.object({
  categoriaId: cuidSchema.optional(),
  description: z.string().nullable().optional(),
  weightKg: z.number().positive().optional(),
  priceAmount: z.number().positive().optional(),
  cobrarEnDestino: z.boolean().optional(),
  destinationBranchId: cuidSchema.nullable().optional(),
  externalDestination: z.string().nullable().optional(),
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
