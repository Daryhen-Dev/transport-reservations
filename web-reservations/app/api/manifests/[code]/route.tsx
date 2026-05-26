import { NextRequest } from "next/server"
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import { prisma } from "@/lib/db"

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 40,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
  },
  headerBlock: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#334155",
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    letterSpacing: 1,
  },
  headerCode: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#334155",
    marginTop: 4,
  },
  headerMeta: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    backgroundColor: "#f1f5f9",
    padding: "5 8",
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 3,
    paddingHorizontal: 8,
  },
  infoLabel: {
    fontFamily: "Helvetica-Bold",
    width: 100,
    color: "#475569",
  },
  infoValue: {
    flex: 1,
    color: "#1e293b",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    padding: "4 8",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  tableRow: {
    flexDirection: "row",
    padding: "4 8",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  tableRowAlt: {
    flexDirection: "row",
    padding: "4 8",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#f8fafc",
  },
  colBold: {
    fontFamily: "Helvetica-Bold",
    color: "#374151",
  },
  emptyText: {
    fontSize: 9,
    color: "#94a3b8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontStyle: "italic",
  },
})

function formatDate(d: Date): string {
  return new Date(d).toLocaleString("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatGenDate(): string {
  return new Date().toLocaleString("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const manifest = await prisma.tripManifest.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      trip: {
        include: {
          branch: { select: { name: true, slug: true } },
          route: { select: { origin: true, destination: true } },
          status: { select: { name: true } },
          crew: {
            include: {
              crewMember: {
                include: { documentType: { select: { name: true } } },
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
                    select: {
                      firstName: true,
                      lastName: true,
                      documentNumber: true,
                      birthDate: true,
                      documentType: { select: { name: true } },
                      country: { select: { nationality: true } },
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
              destinatario: { select: { firstName: true, lastName: true, phone: true } },
              proveedor: { select: { firstName: true, lastName: true, companyName: true } },
              destinationBranch: { select: { name: true } },
            },
          },
        },
      },
    },
  })

  if (!manifest) {
    return new Response("Manifiesto no encontrado", { status: 404 })
  }

  const { trip } = manifest

  const CHILD_MAX_AGE = 12
  const today = new Date()

  type PassengerEntry = {
    firstName: string
    lastName: string
    documentNumber: string
    birthDate: Date | null
    documentType: { name: string }
    country: { nationality: string } | null
  }

  const allPassengers: PassengerEntry[] = trip.passengerReservations.flatMap((r) =>
    r.passengers.map((rp) => rp.passenger as PassengerEntry)
  )
  const totalPassengers = trip.passengerReservations.reduce((sum, r) => sum + r.seatCount, 0)

  let adults = 0
  let children = 0
  const noAge = allPassengers.every((p) => !p.birthDate)
  if (noAge) {
    adults = totalPassengers
  } else {
    for (const p of allPassengers) {
      if (!p.birthDate) {
        adults++
      } else {
        const age = today.getFullYear() - new Date(p.birthDate).getFullYear()
        age < CHILD_MAX_AGE ? children++ : adults++
      }
    }
  }

  // Group passengers by nationality
  const passengersByNationality = allPassengers.reduce<Record<string, PassengerEntry[]>>((acc, p) => {
    const key = p.country?.nationality ?? "Sin nacionalidad registrada"
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

  const totalCargo = trip.cargoReservations.length

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerBlock}>
          <Text style={styles.headerTitle}>MANIFIESTO DE VIAJE</Text>
          <Text style={styles.headerCode}>{manifest.code}</Text>
          <Text style={styles.headerMeta}>Generado: {formatGenDate()} · Sucursal: {trip.branch.name}</Text>
        </View>

        {/* Datos del viaje */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DATOS DEL VIAJE</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ruta:</Text>
            <Text style={styles.infoValue}>{trip.route.origin} → {trip.route.destination}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fecha de salida:</Text>
            <Text style={styles.infoValue}>{formatDate(trip.departureAt)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Estado:</Text>
            <Text style={styles.infoValue}>{trip.status.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pasajeros:</Text>
            <Text style={styles.infoValue}>{totalPassengers} asiento(s) reservado(s)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Encomiendas:</Text>
            <Text style={styles.infoValue}>{totalCargo} ítem(s)</Text>
          </View>
        </View>

        {/* Tripulación */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TRIPULACIÓN</Text>
          {trip.crew.length === 0 ? (
            <Text style={styles.emptyText}>Sin tripulación asignada</Text>
          ) : (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.colBold, { flex: 3 }]}>Nombre</Text>
                <Text style={[styles.colBold, { flex: 2 }]}>Rol</Text>
                <Text style={[styles.colBold, { flex: 3 }]}>Documento</Text>
              </View>
              {trip.crew.map((c, i) => (
                <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={{ flex: 3 }}>{c.crewMember.firstName} {c.crewMember.lastName}</Text>
                  <Text style={{ flex: 2 }}>{c.crewRole.name}</Text>
                  <Text style={{ flex: 3 }}>{c.crewMember.documentType.name} {c.crewMember.documentNumber}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Pasajeros */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PASAJEROS</Text>
          {trip.passengerReservations.length === 0 ? (
            <Text style={styles.emptyText}>Sin reservas de pasajeros</Text>
          ) : (
            <>
              <View style={[styles.infoRow, { marginBottom: 8 }]}>
                <Text style={styles.infoLabel}>Total:</Text>
                <Text style={styles.infoValue}>
                  {totalPassengers} pasajero(s) — {adults} adulto(s){children > 0 ? `, ${children} niño(s)` : noAge ? " (sin fechas de nacimiento registradas)" : ""}
                </Text>
              </View>
              <View style={styles.tableHeader}>
                <Text style={[styles.colBold, { flex: 3 }]}>Nombre</Text>
                <Text style={[styles.colBold, { flex: 2 }]}>Tipo Doc.</Text>
                <Text style={[styles.colBold, { flex: 2 }]}>Documento</Text>
                <Text style={[styles.colBold, { flex: 1.5 }]}>Tipo</Text>
              </View>
              {Object.entries(passengersByNationality).map(([nationality, passengers], gi) => (
                <View key={gi}>
                  <View style={{ backgroundColor: "#f1f5f9", paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: "#475569" }}>
                      {nationality} ({passengers.length})
                    </Text>
                  </View>
                  {passengers.map((p, pi) => {
                    const age = p.birthDate
                      ? today.getFullYear() - new Date(p.birthDate).getFullYear()
                      : null
                    const tipo = age === null ? "Adulto" : age < CHILD_MAX_AGE ? "Niño" : "Adulto"
                    return (
                      <View key={pi} style={pi % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                        <Text style={{ flex: 3 }}>{p.firstName} {p.lastName}</Text>
                        <Text style={{ flex: 2 }}>{p.documentType.name}</Text>
                        <Text style={{ flex: 2 }}>{p.documentNumber}</Text>
                        <Text style={{ flex: 1.5 }}>{tipo}</Text>
                      </View>
                    )
                  })}
                </View>
              ))}
            </>
          )}
        </View>

        {/* Encomiendas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ENCOMIENDAS</Text>
          {trip.cargoReservations.length === 0 ? (
            <Text style={styles.emptyText}>Sin encomiendas</Text>
          ) : (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.colBold, { flex: 2 }]}>Remitente</Text>
                <Text style={[styles.colBold, { flex: 2 }]}>Descripción</Text>
                <Text style={[styles.colBold, { flex: 1 }]}>Peso</Text>
                <Text style={[styles.colBold, { flex: 1.5 }]}>Categoría</Text>
                <Text style={[styles.colBold, { flex: 2 }]}>Destinatario</Text>
                <Text style={[styles.colBold, { flex: 2 }]}>Destino</Text>
              </View>
              {trip.cargoReservations.map((c, i) => {
                const remitente = c.proveedor.companyName
                  ?? `${c.proveedor.firstName ?? ""} ${c.proveedor.lastName ?? ""}`.trim()
                const destinatario = c.destinatario
                  ? `${c.destinatario.firstName} ${c.destinatario.lastName}`
                  : "—"
                const destino = c.destinationBranch?.name ?? c.externalDestination ?? "—"
                return (
                  <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                    <Text style={{ flex: 2 }}>{remitente}</Text>
                    <Text style={{ flex: 2 }}>{c.description ?? "—"}</Text>
                    <Text style={{ flex: 1 }}>{c.weightKg} kg</Text>
                    <Text style={{ flex: 1.5 }}>{c.categoria?.name ?? "—"}</Text>
                    <Text style={{ flex: 2 }}>{destinatario}</Text>
                    <Text style={{ flex: 2 }}>{destino}</Text>
                  </View>
                )
              })}
            </>
          )}
        </View>

        {/* Footer */}
        <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 8 }}>
          <Text style={{ fontSize: 8, color: "#94a3b8", textAlign: "center" }}>
            {manifest.code} · Documento generado automáticamente — válido solo con firma autorizada
          </Text>
        </View>
      </Page>
    </Document>
  )

  const buffer = await renderToBuffer(doc)

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="manifiesto-${manifest.code}.pdf"`,
    },
  })
}
