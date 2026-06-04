import { z } from "zod";
import { cuidSchema } from "./cuid";
import { PRICE_TYPES } from "@/lib/pricing";

// Inline proveedor — solo PERSONA. Para AGENCIA / INSTITUCION_PUBLICA se
// crea el proveedor previamente y se usa el flujo quick por proveedorId.
export const proveedorInputSchema = z.object({
  customerType: z.literal("PERSONA"),
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  documentTypeId: cuidSchema,
  documentNumber: z.string().min(1, "El número de documento es requerido"),
  email: z.string().email("Email inválido"),
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

const priceTypeSchema = z.enum(PRICE_TYPES);
const priceAmountSchema = z
  .number()
  .positive("El precio debe ser mayor a 0")
  .optional();

// Full create: inline proveedor + (optional) inline passengers attached in tx.
export const createPassengerReservationSchema = z.object({
  tripId: cuidSchema,
  seatCount: z.number().int().min(1, "Debe reservar al menos 1 asiento"),
  proveedor: proveedorInputSchema,
  proveedorTypeId: cuidSchema,
  reservationStatusId: cuidSchema.optional(),
  passengers: z.array(inlinePassengerSchema).optional(),
  priceType: priceTypeSchema,
  // Solo se manda cuando priceType=LIBRE. El server ignora este campo
  // para NORMAL/REFERIDOS y aplica la constante global.
  priceAmount: priceAmountSchema,
});

// Quick create (calendar "nueva reserva" flow): existing proveedor + auto-trip.
export const createQuickPassengerReservationSchema = z.object({
  scheduleId: cuidSchema,
  date: z.string().min(1, "La fecha es requerida"),
  branchId: cuidSchema,
  proveedorId: cuidSchema,
  seatCount: z.number().int().min(1, "Debe reservar al menos 1 asiento"),
  isPending: z.boolean().optional(),
  priceType: priceTypeSchema,
  priceAmount: priceAmountSchema,
});

// Quick-transferred: crea la reserva directo en estado TRANSFERIDA.
// El proveedor (comprador) debe ser PERSONA o INSTITUCION_PUBLICA — AGENCIA
// queda afuera para evitar cruces de comisiones. La agencia destino debe ser
// AGENCIA. Precio = NORMAL ($30) fijo, sin opcion LIBRE. Pasajeros son
// obligatorios y la cantidad debe coincidir con seatCount: registramos sus
// datos porque despues los compartimos con la agencia destino.
export const createQuickTransferredReservationSchema = z.object({
  scheduleId: cuidSchema,
  date: z.string().min(1, "La fecha es requerida"),
  branchId: cuidSchema,
  proveedorId: cuidSchema,
  transferredToAgencyId: cuidSchema,
  seatCount: z.number().int().min(1, "Debe reservar al menos 1 asiento"),
  passengers: z
    .array(inlinePassengerSchema)
    .min(1, "Debe registrar al menos 1 pasajero"),
});

export const updateReservationStatusSchema = z.object({
  reservationStatusId: cuidSchema,
});

export const updatePassengerReservationSchema = z.object({
  seatCount: z.number().int().min(1, "Mínimo 1 asiento").optional(),
  tripId: cuidSchema.optional(),
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
export type CreateQuickTransferredReservationInput = z.infer<
  typeof createQuickTransferredReservationSchema
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
