import { z } from "zod";
import { cuidSchema } from "./cuid";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const timeSchema = z
  .string()
  .regex(timeRegex, "Formato inválido (HH:MM)");

export const createTripScheduleSchema = z.object({
  routeId: cuidSchema,
  time: timeSchema,
  // Omit `.default(true)` to keep the resolver typing clean; the API
  // defaults to true server-side when isActive is undefined.
  isActive: z.boolean().optional(),
});

export const updateTripScheduleSchema = z.object({
  time: timeSchema.optional(),
  isActive: z.boolean().optional(),
});

export type CreateTripScheduleInput = z.infer<typeof createTripScheduleSchema>;
export type UpdateTripScheduleInput = z.infer<typeof updateTripScheduleSchema>;
