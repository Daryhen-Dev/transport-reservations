import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/api/with-auth"
import { createAgencyPaymentSchema } from "@/lib/api/schemas/agency-payments"
import { auditCreate } from "@/lib/api/audit"
import { requireBranchAccess } from "@/lib/api/auth"

export const POST = withAuth(async (req, { auth }) => {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
      { status: 400 }
    )
  }

  const parsed = createAgencyPaymentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: parsed.error.issues[0]?.message ?? "Invalid body",
        },
      },
      { status: 400 }
    )
  }

  const { agencyId, branchId, amount, paymentDate, notes } = parsed.data

  const gate = await requireBranchAccess(req, branchId)
  if (gate instanceof NextResponse) return gate

  const agency = await prisma.proveedor.findUnique({
    where: { id: agencyId },
    select: { id: true, proveedorType: { select: { name: true } } },
  })
  if (!agency) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Agencia no encontrada" } },
      { status: 404 }
    )
  }
  if (agency.proveedorType.name !== "AGENCIA") {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "El proveedor debe ser tipo AGENCIA",
        },
      },
      { status: 400 }
    )
  }

  try {
    const created = await prisma.agencyPayment.create({
      data: {
        agencyId,
        amount,
        paymentDate: new Date(paymentDate),
        notes: notes && notes.length > 0 ? notes : null,
        branchId,
        ...auditCreate(auth.userId),
      },
      include: {
        agency: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
          },
        },
        branch: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json({ data: created }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Error al registrar pago" } },
      { status: 400 }
    )
  }
})
