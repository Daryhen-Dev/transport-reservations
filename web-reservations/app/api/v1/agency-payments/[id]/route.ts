import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/api/with-auth"
import { requireBranchAccess } from "@/lib/api/auth"
import { updateAgencyPaymentSchema } from "@/lib/api/schemas/agency-payments"
import { auditUpdate } from "@/lib/api/audit"

export const PATCH = withAuth<{ id: string }>(async (req, { params, auth }) => {
  const payment = await prisma.agencyPayment.findUnique({
    where: { id: params.id },
    select: { id: true, branchId: true },
  })
  if (!payment) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Pago no encontrado" } },
      { status: 404 }
    )
  }

  const gate = await requireBranchAccess(req, payment.branchId)
  if (gate instanceof NextResponse) return gate

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
      { status: 400 }
    )
  }

  const parsed = updateAgencyPaymentSchema.safeParse(body)
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

  const { notes } = parsed.data
  const normalizedNotes =
    notes !== null && notes.trim().length > 0 ? notes.trim() : null

  try {
    const updated = await prisma.agencyPayment.update({
      where: { id: params.id },
      data: {
        notes: normalizedNotes,
        ...auditUpdate(auth.userId),
      },
    })
    return NextResponse.json({ data: updated })
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Error al actualizar pago" } },
      { status: 400 }
    )
  }
})

export const DELETE = withAuth<{ id: string }>(async (req, { params }) => {
  const payment = await prisma.agencyPayment.findUnique({
    where: { id: params.id },
    select: { id: true, branchId: true },
  })
  if (!payment) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Pago no encontrado" } },
      { status: 404 }
    )
  }

  const gate = await requireBranchAccess(req, payment.branchId)
  if (gate instanceof NextResponse) return gate

  try {
    await prisma.agencyPayment.delete({ where: { id: params.id } })
    return new Response(null, { status: 204 })
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Error al eliminar pago" } },
      { status: 400 }
    )
  }
})
