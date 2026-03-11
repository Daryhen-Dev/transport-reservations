import { prisma } from "@/lib/db";

export async function getCustomers() {
  return prisma.customer.findMany({
    include: {
      customerType: { select: { id: true, name: true } },
      country: { select: { id: true, name: true } },
      documentType: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function searchCustomers(query: string) {
  return prisma.customer.findMany({
    where: {
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { companyName: { contains: query, mode: "insensitive" } },
        { documentNumber: { contains: query, mode: "insensitive" } },
      ],
    },
    include: {
      customerType: { select: { id: true, name: true } },
      country: { select: { id: true, name: true } },
      documentType: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
