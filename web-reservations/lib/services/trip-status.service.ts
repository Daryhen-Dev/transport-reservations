import { prisma } from "@/lib/db";

export async function getTripStatuses() {
  return prisma.tripStatus.findMany({ orderBy: { name: "asc" } });
}
