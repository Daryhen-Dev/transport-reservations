import { prisma } from "@/lib/db"

/**
 * Saldo con una agencia = total de cargos generados por reservas (REFERIDOS
 * commission + TRANSFERIDA transferAmount) − total de pagos registrados.
 *
 * Los cargos vienen de:
 *   - PassengerReservation con priceType=REFERIDOS y proveedor=agencia
 *     (commissionAmount es lo que les debemos).
 *   - PassengerReservation con status=TRANSFERIDA y transferredToAgency=agencia
 *     (transferAmountToAgency es lo que les debemos).
 *
 * Las reservas con status=CANCELADA NO generan cargo (a menos que despues
 * de cancelarse ya hayamos pagado — en ese caso el saldo queda negativo y
 * el operador lo corrige registrando un pago compensatorio).
 */

export type AgencyBalanceSummary = {
  agencyId: string
  agencyName: string
  totalCharges: number
  totalPayments: number
  balance: number // lo que aun les debemos (>0) o nos pasamos (<0)
  chargeCount: number
  paymentCount: number
}

export type AgencyChargePassenger = {
  firstName: string
  lastName: string
  documentTypeName: string | null
  documentNumber: string
  countryName: string | null
}

export type ChargeStatus = "PAID" | "PARTIAL" | "PENDING"

export type AgencyChargeLine = {
  reservationId: string
  source: "REFERIDOS" | "TRANSFERIDA"
  tripDepartureAt: Date
  routeLabel: string
  seatCount: number
  amount: number
  paidAmount: number
  status: ChargeStatus
  createdAt: Date
  passengers: AgencyChargePassenger[]
}

export type AgencyPaymentLine = {
  id: string
  amount: number
  paymentDate: Date
  notes: string | null
  branchName: string
  createdAt: Date
}

export type AgencyBalanceDetail = {
  agencyId: string
  agencyName: string
  totalCharges: number
  totalPayments: number
  balance: number
  charges: AgencyChargeLine[]
  payments: AgencyPaymentLine[]
}

function agencyDisplay(p: {
  firstName: string | null
  lastName: string | null
  companyName: string | null
}): string {
  const name =
    p.companyName ?? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim()
  return name === "" ? "—" : name
}

/**
 * Lista todas las agencias con actividad (charges o payments) en la
 * sucursal indicada, junto a su saldo neto.
 */
export async function getAgenciesWithBalance(
  branchId: string
): Promise<AgencyBalanceSummary[]> {
  // Recolectar cargos REFERIDOS por agencia
  const referidosRows = await prisma.passengerReservation.findMany({
    where: {
      priceType: "REFERIDOS",
      reservationStatus: { name: { not: "CANCELADA" } },
      trip: { branchId },
      proveedor: { proveedorType: { name: "AGENCIA" } },
    },
    select: {
      proveedorId: true,
      proveedor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
        },
      },
      commissionAmount: true,
    },
  })

  // Cargos TRANSFERIDA
  const transferRows = await prisma.passengerReservation.findMany({
    where: {
      reservationStatus: { name: "TRANSFERIDA" },
      trip: { branchId },
      transferredToAgencyId: { not: null },
    },
    select: {
      transferredToAgencyId: true,
      transferredToAgency: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
        },
      },
      transferAmountToAgency: true,
    },
  })

  // Pagos
  const paymentRows = await prisma.agencyPayment.findMany({
    where: { branchId },
    select: {
      agencyId: true,
      agency: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
        },
      },
      amount: true,
    },
  })

  type Acc = {
    agencyName: string
    totalCharges: number
    totalPayments: number
    chargeCount: number
    paymentCount: number
  }
  const map = new Map<string, Acc>()

  function ensure(id: string, p: {
    firstName: string | null
    lastName: string | null
    companyName: string | null
  }): Acc {
    const existing = map.get(id)
    if (existing) return existing
    const fresh: Acc = {
      agencyName: agencyDisplay(p),
      totalCharges: 0,
      totalPayments: 0,
      chargeCount: 0,
      paymentCount: 0,
    }
    map.set(id, fresh)
    return fresh
  }

  for (const r of referidosRows) {
    if (!r.commissionAmount) continue
    const acc = ensure(r.proveedorId, r.proveedor)
    acc.totalCharges += Number(r.commissionAmount.toString())
    acc.chargeCount += 1
  }

  for (const r of transferRows) {
    if (!r.transferredToAgencyId || !r.transferredToAgency) continue
    if (!r.transferAmountToAgency) continue
    const acc = ensure(r.transferredToAgencyId, r.transferredToAgency)
    acc.totalCharges += Number(r.transferAmountToAgency.toString())
    acc.chargeCount += 1
  }

  for (const p of paymentRows) {
    const acc = ensure(p.agencyId, p.agency)
    acc.totalPayments += Number(p.amount.toString())
    acc.paymentCount += 1
  }

  return Array.from(map.entries())
    .map(([agencyId, acc]) => ({
      agencyId,
      agencyName: acc.agencyName,
      totalCharges: acc.totalCharges,
      totalPayments: acc.totalPayments,
      balance: acc.totalCharges - acc.totalPayments,
      chargeCount: acc.chargeCount,
      paymentCount: acc.paymentCount,
    }))
    .sort((a, b) => b.balance - a.balance)
}

/**
 * Detalle del saldo de UNA agencia. Devuelve cargos linea por linea
 * (REFERIDOS y TRANSFERIDA) y el historial de pagos cronologico inverso.
 */
export async function getAgencyBalanceDetail(
  agencyId: string,
  branchId: string
): Promise<AgencyBalanceDetail | null> {
  const agency = await prisma.proveedor.findUnique({
    where: { id: agencyId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      companyName: true,
      proveedorType: { select: { name: true } },
    },
  })
  if (!agency || agency.proveedorType.name !== "AGENCIA") return null

  const [referidosRows, transferRows, payments] = await Promise.all([
    prisma.passengerReservation.findMany({
      where: {
        priceType: "REFERIDOS",
        reservationStatus: { name: { not: "CANCELADA" } },
        proveedorId: agencyId,
        trip: { branchId },
      },
      select: {
        id: true,
        seatCount: true,
        commissionAmount: true,
        createdAt: true,
        trip: {
          select: {
            departureAt: true,
            route: { select: { origin: true, destination: true } },
          },
        },
        passengers: {
          select: {
            passenger: {
              select: {
                firstName: true,
                lastName: true,
                documentNumber: true,
                documentType: { select: { name: true } },
                country: { select: { name: true } },
              },
            },
          },
          orderBy: { passenger: { lastName: "asc" } },
        },
      },
    }),
    prisma.passengerReservation.findMany({
      where: {
        reservationStatus: { name: "TRANSFERIDA" },
        transferredToAgencyId: agencyId,
        trip: { branchId },
      },
      select: {
        id: true,
        seatCount: true,
        transferAmountToAgency: true,
        createdAt: true,
        trip: {
          select: {
            departureAt: true,
            route: { select: { origin: true, destination: true } },
          },
        },
        passengers: {
          select: {
            passenger: {
              select: {
                firstName: true,
                lastName: true,
                documentNumber: true,
                documentType: { select: { name: true } },
                country: { select: { name: true } },
              },
            },
          },
          orderBy: { passenger: { lastName: "asc" } },
        },
      },
    }),
    prisma.agencyPayment.findMany({
      where: { agencyId, branchId },
      select: {
        id: true,
        amount: true,
        paymentDate: true,
        notes: true,
        createdAt: true,
        branch: { select: { name: true } },
      },
      orderBy: { paymentDate: "desc" },
    }),
  ])

  function mapPassengers(
    rows: Array<{
      passenger: {
        firstName: string
        lastName: string
        documentNumber: string
        documentType: { name: string } | null
        country: { name: string } | null
      }
    }>
  ): AgencyChargePassenger[] {
    return rows.map((p) => ({
      firstName: p.passenger.firstName,
      lastName: p.passenger.lastName,
      documentNumber: p.passenger.documentNumber,
      documentTypeName: p.passenger.documentType?.name ?? null,
      countryName: p.passenger.country?.name ?? null,
    }))
  }

  const charges: AgencyChargeLine[] = []

  for (const r of referidosRows) {
    if (!r.commissionAmount) continue
    charges.push({
      reservationId: r.id,
      source: "REFERIDOS",
      tripDepartureAt: r.trip.departureAt,
      routeLabel: `${r.trip.route.origin} → ${r.trip.route.destination}`,
      seatCount: r.seatCount,
      amount: Number(r.commissionAmount.toString()),
      paidAmount: 0,
      status: "PENDING",
      createdAt: r.createdAt,
      passengers: mapPassengers(r.passengers),
    })
  }

  for (const r of transferRows) {
    if (!r.transferAmountToAgency) continue
    charges.push({
      reservationId: r.id,
      source: "TRANSFERIDA",
      tripDepartureAt: r.trip.departureAt,
      routeLabel: `${r.trip.route.origin} → ${r.trip.route.destination}`,
      seatCount: r.seatCount,
      amount: Number(r.transferAmountToAgency.toString()),
      paidAmount: 0,
      status: "PENDING",
      createdAt: r.createdAt,
      passengers: mapPassengers(r.passengers),
    })
  }

  // Asignacion FIFO: ordenar del mas viejo al mas nuevo y consumir el pool
  // de pagos. Cuanto cubrio cada cargo determina su status.
  charges.sort((a, b) => a.tripDepartureAt.getTime() - b.tripDepartureAt.getTime())

  const totalPaymentsPool = payments.reduce(
    (sum, p) => sum + Number(p.amount.toString()),
    0
  )
  let remaining = totalPaymentsPool

  for (const c of charges) {
    if (remaining <= 0) {
      c.paidAmount = 0
      c.status = "PENDING"
      continue
    }
    if (remaining >= c.amount) {
      c.paidAmount = c.amount
      c.status = "PAID"
      remaining -= c.amount
    } else {
      c.paidAmount = remaining
      c.status = "PARTIAL"
      remaining = 0
    }
  }

  // Mostrar del mas reciente al mas viejo en la UI.
  charges.reverse()

  const paymentLines: AgencyPaymentLine[] = payments.map((p) => ({
    id: p.id,
    amount: Number(p.amount.toString()),
    paymentDate: p.paymentDate,
    notes: p.notes,
    branchName: p.branch.name,
    createdAt: p.createdAt,
  }))

  const totalCharges = charges.reduce((sum, c) => sum + c.amount, 0)
  const totalPayments = paymentLines.reduce((sum, p) => sum + p.amount, 0)

  return {
    agencyId: agency.id,
    agencyName: agencyDisplay(agency),
    totalCharges,
    totalPayments,
    balance: totalCharges - totalPayments,
    charges,
    payments: paymentLines,
  }
}
