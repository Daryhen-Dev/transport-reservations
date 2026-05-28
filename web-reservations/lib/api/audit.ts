/**
 * Audit helpers — return Prisma `data` slices to spread into create/update
 * calls so every mutation stamps the user who performed it.
 *
 * Usage:
 *   await prisma.trip.create({
 *     data: { ...payload, ...auditCreate(ctx.auth.userId) },
 *   });
 *
 *   await prisma.trip.update({
 *     where: { id },
 *     data: { ...payload, ...auditUpdate(ctx.auth.userId) },
 *   });
 *
 * The fields are nullable in the schema, so calling without the helper still
 * works — the row simply won't carry the audit trail. Use the helpers
 * everywhere on the write path.
 */

/** Spread into a `prisma.<entity>.create({ data })` call. Stamps both
 *  createdById and updatedById with the same user on initial create. */
export function auditCreate(userId: string) {
  return {
    createdById: userId,
    updatedById: userId,
  };
}

/** Spread into a `prisma.<entity>.update({ data })` call. */
export function auditUpdate(userId: string) {
  return {
    updatedById: userId,
  };
}

/** For entities that only track creation (e.g. TripManifest, User). */
export function auditCreateOnly(userId: string) {
  return {
    createdById: userId,
  };
}
