import { prisma } from "@/lib/db";

export async function getProveedores() {
  return prisma.proveedor.findMany({
    include: {
      proveedorType: { select: { id: true, name: true } },
      country: { select: { id: true, name: true } },
      documentType: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProveedorTypes() {
  return prisma.proveedorType.findMany({ orderBy: { name: "asc" } });
}

export async function getDocumentTypes() {
  return prisma.documentType.findMany({ orderBy: { name: "asc" } });
}

export async function searchProveedores(query: string) {
  return prisma.proveedor.findMany({
    where: {
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { companyName: { contains: query, mode: "insensitive" } },
        { documentNumber: { contains: query, mode: "insensitive" } },
      ],
    },
    include: {
      proveedorType: { select: { id: true, name: true } },
      country: { select: { id: true, name: true } },
      documentType: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function searchProveedoresByType(query: string, proveedorTypeId?: string) {
  if (query.length < 2) return []
  return prisma.proveedor.findMany({
    where: {
      ...(proveedorTypeId ? { proveedorTypeId } : {}),
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { companyName: { contains: query, mode: "insensitive" } },
        { documentNumber: { contains: query, mode: "insensitive" } },
      ],
    },
    include: { proveedorType: true, documentType: true },
    take: 10,
  })
}
