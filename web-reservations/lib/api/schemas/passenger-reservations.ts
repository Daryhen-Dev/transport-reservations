import { z } from "zod";
import { cuidSchema } from "./cuid";

// Inline proveedor — solo PERSONA. Para AGENCIA / INSTITUCION_PUBLICA se
// crea el proveedor previamente y se usa el flujo quick por proveedorId.
export const proveedorInputSchema = z.object({
  customerType: z.literal("PERSONA"),
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  documentTypeId: cuidSchema,
  documentNumber: z.string().min(1, "El número de documento es requerido"),
  countryId: cuidSchema,
  birthDate: z.string().optional(),
});

const inlinePassengerSchema = z.object({
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  documentTypeId: cuidSchema,
  documentNumber: z.string().min(1, "El número de documento es requerido"),
  countryId: cuidSchema,
  birthDate: z.string().optional(),
});

const priceField = z.number().positive("El precio debe ser mayor a 0");
const commissionField = z
  .number()
  .nonnegative("La comisión no puede ser negativa")
  .nullable()
  .optional();
const referralField = cuidSchema.nullable().optional();

// Full create: inline proveedor + (optional) inline passengers attached in tx.
export const createPassengerReservationSchema = z.object({
  tripId: cuidSchema,
  seatCount: z.number().int().min(1, "Debe reservar al menos 1 asiento"),
  proveedor: proveedorInputSchema,
  proveedorTypeId: cuidSchema,
  reservationStatusId: cuidSchema.optional(),
  passengers: z.array(inlinePassengerSchema).optional(),
  priceAmount: priceField,
  referredByAgencyId: referralField,
  commissionAmount: commissionField,
});

// Quick create (calendar "nueva reserva" flow): existing proveedor + auto-trip.
export const createQuickPassengerReservationSchema = z.object({
  scheduleId: cuidSchema,
  date: z.string().min(1, "La fecha es requerida"),
  branchId: cuidSchema,
  proveedorId: cuidSchema,
  seatCount: z.number().int().min(1, "Debe reservar al menos 1 asiento"),
  isPending: z.boolean().optional(),
  priceAmount: priceField,
  referredByAgencyId: referralField,
  commissionAmount: commissionField,
});

export const updateReservationStatusSchema = z.object({
  reservationStatusId: cuidSchema,
});

export const updatePassengerReservationSchema = z.object({
  seatCount: z.number().int().min(1, "Mínimo 1 asiento").optional(),
  tripId: cuidSchema.optional(),
  priceAmount: priceField.optional(),
  referredByAgencyId: referralField,
  commissionAmount: commissionField,
});

// Nested /passengers: discriminated body — create new + link, or link existing.
const addPassengerByCreateSchema = z.object({
  mode: z.literal("create"),
  passenger: z.object({
    firstName: z.string().min(1, "El nombre es requerido"),
    lastName: z.string().min(1, "El apellido es requerido"),
    documentTypeId: cuidSchema,
    documentNumber: z.string().min(1, "El número de documento es requerido"),
    countryId: cuidSchema,
    birthDate: z.string().optional(),
    phone: z.string().optional(),
  }),
});

const addPassengerByLinkSchema = z.object({
  mode: z.literal("link"),
  passengerId: cuidSchema,
});

export const addPassengerSchema = z.discriminatedUnion("mode", [
  addPassengerByCreateSchema,
  addPassengerByLinkSchema,
]);

export type CreatePassengerReservationInput = z.infer<
  typeof createPassengerReservationSchema
>;
export type CreateQuickPassengerReservationInput = z.infer<
  typeof createQuickPassengerReservationSchema
>;
export type UpdateReservationStatusInput = z.infer<
  typeof updateReservationStatusSchema
>;
export type UpdatePassengerReservationInput = z.infer<
  typeof updatePassengerReservationSchema
>;
export type AddPassengerInput = z.infer<typeof addPassengerSchema>;
export type AddPassengerByCreateInput = z.infer<typeof addPassengerByCreateSchema>;
export type AddPassengerByLinkInput = z.infer<typeof addPassengerByLinkSchema>;
