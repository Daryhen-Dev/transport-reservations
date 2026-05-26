import { getCrewMembers } from "@/lib/services/crew-member.service";
import { prisma } from "@/lib/db";
import { CrewMembersTable } from "./_components/crew-members-table";

export default async function TripulacionPage() {
  const [crewMembers, documentTypes] = await Promise.all([
    getCrewMembers(),
    prisma.documentType.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-2xl font-semibold">Tripulación</h1>
        <p className="text-sm text-muted-foreground">
          Administrá los tripulantes de la agencia
        </p>
      </div>
      <CrewMembersTable data={crewMembers} documentTypes={documentTypes} />
    </div>
  );
}
