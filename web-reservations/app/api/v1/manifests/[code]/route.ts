import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";

export const GET = withAuth<{ code: string }>(async (_req, { params }) => {
  const code = params.code.trim().toUpperCase();
  if (!code) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Código de manifiesto requerido" } },
      { status: 400 }
    );
  }

  const manifest = await prisma.tripManifest.findUnique({
    where: { code },
    include: {
      trip: {
        include: {
          branch: { select: { id: true, name: true, slug: true } },
          route: { select: { origin: true, destination: true } },
          status: { select: { name: true } },
          crew: {
            include: {
              crewMember: {
                include: {
                  documentType: { select: { name: true } },
                },
              },
              crewRole: { select: { name: true } },
            },
          },
          passengerReservations: {
            where: { reservationStatus: { name: { not: "CANCELADA" } } },
            include: {
              proveedor: {
                select: {
                  firstName: true,
                  lastName: true,
                  companyName: true,
                  proveedorType: { select: { name: true } },
                },
              },
              passengers: {
                include: {
                  passenger: {
                    include: {
                      documentType: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
          cargoReservations: {
            where: { reservationStatus: { name: { not: "CANCELADA" } } },
            include: {
              categoria: { select: { name: true } },
              destinatario: {
                select: { firstName: true, lastName: true, phone: true },
              },
              proveedor: {
                select: { firstName: true, lastName: true, companyName: true },
              },
              destinationBranch: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!manifest) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Código no encontrado" } },
      { status: 404 }
    );
  }

  // Record first receipt by a different branch than the originator (parity
  // with the legacy `lookupManifestAction`). The receiving branch is the
  // looking-up user's own branch when present; OWNER lookups skip this.
  if (!manifest.receivedByBranchId) {
    // Find a candidate "receiving" branch from the requesting user.
    const requester = await prisma.user.findUnique({
      where: { id: (await getAuthUserId()) ?? "" },
      select: { branchId: true },
    });
    if (
      requester?.branchId &&
      requester.branchId !== manifest.trip.branch.id
    ) {
      await prisma.tripManifest.update({
        where: { id: manifest.id },
        data: {
          receivedByBranchId: requester.branchId,
          receivedAt: new Date(),
        },
      });
    }
  }

  return NextResponse.json({ data: manifest });
});

// Helper kept inline so the route module is self-contained. Uses NextAuth
// session (the cookie path that withAuth already validated). Bearer-token
// requests skip the receivedBy tracking — that's fine, mobile is read-only.
async function getAuthUserId(): Promise<string | null> {
  const { auth } = await import("@/auth");
  const session = await auth();
  return session?.user?.id ?? null;
}
