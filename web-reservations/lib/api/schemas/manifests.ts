import { z } from "zod";

// Manifest endpoints currently take no body:
// - POST /api/v1/trips/:tripId/manifest — code is auto-generated server-side.
// - GET  /api/v1/manifests/:code        — code is in the URL.
// - GET  /api/v1/manifests/:code/pdf    — code is in the URL.
//
// This schema exists for forward-compat; today it accepts an empty object
// (or an absent body). If we add optional fields later (e.g. a custom code),
// keep them optional so older clients keep working.
export const generateManifestSchema = z
  .object({})
  .strict()
  .optional()
  .default({});

export type GenerateManifestInput = z.infer<typeof generateManifestSchema>;
