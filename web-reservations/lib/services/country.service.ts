import { prisma } from "@/lib/db";

export async function getCountries() {
  return prisma.country.findMany({
    orderBy: { name: "asc" },
  });
}
