import { z } from "zod";

export const cuidSchema = z.string().cuid();
