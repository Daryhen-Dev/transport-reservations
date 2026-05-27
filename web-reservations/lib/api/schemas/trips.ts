import { z } from "zod";
import { cuidSchema } from "./cuid";

const departureAtSchema = z.coerce.date({
  error: "Fecha y hora de salida inválida",
});

// statusId accepts non-CUID stable IDs from the seed (e.g. "tripstatus_abierto"),
// so it's just a non-empty string. Other FK fields are CUIDs from Prisma defaults.
const statusIdSchema = z.string().min(1, "statusId requerido");

export const createTripSchema = z.object({
  departureAt: departureAtSchema,
  routeId: cuidSchema,
  branchId: cuidSchema,
  scheduleId: cuidSchema.nullable().optional(),
  // statusId is optional — when absent, the API defaults to the ABIERTO status.
  statusId: statusIdSchema.optional(),
});

export const updateTripSchema = z.object({
  departureAt: departureAtSchema.optional(),
  routeId: cuidSchema.optional(),
  branchId: cuidSchema.optional(),
  scheduleId: cuidSchema.nullable().optional(),
  statusId: statusIdSchema.optional(),
});

export const assignCrewSchema = z.object({
  crewRoleId: cuidSchema,
});

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type AssignCrewInput = z.infer<typeof assignCrewSchema>;
