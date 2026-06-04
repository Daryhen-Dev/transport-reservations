import { z } from "zod"
import { cuidSchema } from "./cuid"

export const createAgencyPaymentSchema = z.object({
  agencyId: cuidSchema,
  branchId: cuidSchema,
  amount: z.number().positive("El monto debe ser mayor a 0"),
  paymentDate: z.string().min(1, "La fecha es requerida"),
  notes: z.string().optional(),
})

export const updateAgencyPaymentSchema = z.object({
  notes: z.string().nullable(),
})

export type CreateAgencyPaymentInput = z.infer<
  typeof createAgencyPaymentSchema
>
export type UpdateAgencyPaymentInput = z.infer<
  typeof updateAgencyPaymentSchema
>
