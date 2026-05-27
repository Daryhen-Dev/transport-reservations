import { z } from "zod";
import { cuidSchema } from "./cuid";

export const branchIdSchema = cuidSchema;

export const branchIdQuerySchema = z.object({
  branchId: branchIdSchema,
});

export const branchIdBodySchema = z.object({
  branchId: branchIdSchema,
});
