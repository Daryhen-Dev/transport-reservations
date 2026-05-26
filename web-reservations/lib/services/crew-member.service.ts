import { prisma } from "@/lib/db";

export type CrewMemberRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  documentNumber: string;
  birthDate: Date | null;
  documentType: { id: string; name: string };
  _count: { trips: number };
};

export async function getCrewMembers(): Promise<CrewMemberRow[]> {
  return prisma.crewMember.findMany({
    include: {
      documentType: { select: { id: true, name: true } },
      _count: { select: { trips: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}
