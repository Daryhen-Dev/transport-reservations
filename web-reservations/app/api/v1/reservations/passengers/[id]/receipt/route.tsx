import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 36,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
  },
  headerBlock: {
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#0f172a",
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    letterSpacing: 0.5,
  },
  headerCode: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#334155",
    marginTop: 4,
  },
  headerMeta: { fontSize: 8, color: "#64748b", marginTop: 4 },
  statusBadge: {
    alignSelf: "flex-start",
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    padding: "3 8",
    borderRadius: 2,
    color: "#ffffff",
    marginTop: 4,
  },
  statusConfirmada: { backgroundColor: "#16a34a" },
  statusPendiente: { backgroundColor: "#d97706" },
  statusCancelada: { backgroundColor: "#dc2626" },
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  infoRow: { flexDirection: "row", marginBottom: 3 },
  infoLabel: { fontFamily: "Helvetica-Bold", width: 90, color: "#475569" },
  infoValue: { flex: 1, color: "#1e293b" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
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
    backgroundColor: "#fafbfc",
  },
  colBold: { fontFamily: "Helvetica-Bold", color: "#374151" },
  emptyText: {
    fontSize: 9,
    color: "#94a3b8",
    fontStyle: "italic",
    paddingVertical: 6,
  },
  footer: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
  },
});

function formatDateTime(d: Date): string {
  return new Date(d).toLocaleString("es-AR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatGenDate(): string {
  return new Date().toLocaleString("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function proveedorDisplay(p: {
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
}): string {
  return (
    p.companyName ??
    `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() ??
    "Sin nombre"
  );
}

export const GET = withAuth<{ id: string }>(async (_req, { params, auth }) => {
  const reservation = await prisma.passengerReservation.findUnique({
    where: { id: params.id },
    include: {
      trip: {
        include: {
          route: { select: { origin: true, destination: true } },
          branch: { select: { id: true, name: true } },
          status: { select: { name: true } },
          manifest: { select: { code: true } },
        },
      },
      proveedor: {
        select: {
          firstName: true,
          lastName: true,
          companyName: true,
          phone: true,
          documentNumber: true,
          documentType: { select: { name: true } },
        },
      },
      externalAgency: {
        select: {
          firstName: true,
          lastName: true,
          companyName: true,
        },
      },
      reservationStatus: { select: { name: true } },
      passengers: {
        include: {
          passenger: {
            select: {
              firstName: true,
              lastName: true,
              documentNumber: true,
              documentType: { select: { name: true } },
              country: { select: { nationality: true } },
            },
          },
        },
      },
    },
  });

  if (!reservation) {
    return new Response("Reserva no encontrada", { status: 404 });
  }

  // SUCURSAL_USER puede ver solo reservas de su sucursal
  if (auth.role === "SUCURSAL_USER" && reservation.trip.branch.id !== auth.branchId) {
    return new Response("Acceso denegado", { status: 403 });
  }

  const { trip, proveedor, reservationStatus, passengers, externalAgency } =
    reservation;
  const channelLabel =
    reservation.salesChannel === "FROM_AGENCY"
      ? "Desde agencia externa"
      : reservation.salesChannel === "TO_AGENCY"
        ? "Con comisión a agencia"
        : "Directo";
  const priceFmt = (v: { toString(): string }) =>
    `$${Number(v.toString()).toFixed(2)}`;
  const shortCode = `PR-${reservation.id.slice(-8).toUpperCase()}`;
  const statusStyle =
    reservationStatus.name === "CONFIRMADA"
      ? styles.statusConfirmada
      : reservationStatus.name === "CANCELADA"
        ? styles.statusCancelada
        : styles.statusPendiente;

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerBlock}>
          <Text style={styles.headerTitle}>RECIBO DE RESERVA</Text>
          <Text style={styles.headerCode}>{shortCode}</Text>
          <Text style={styles.headerMeta}>
            Emitido: {formatGenDate()} · {trip.branch.name}
          </Text>
          <Text style={[styles.statusBadge, statusStyle]}>
            {reservationStatus.name}
          </Text>
        </View>

        {/* Datos del viaje */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del viaje</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ruta:</Text>
            <Text style={styles.infoValue}>
              {trip.route.origin} → {trip.route.destination}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Salida:</Text>
            <Text style={styles.infoValue}>{formatDateTime(trip.departureAt)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sucursal:</Text>
            <Text style={styles.infoValue}>{trip.branch.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Estado viaje:</Text>
            <Text style={styles.infoValue}>{trip.status.name}</Text>
          </View>
          {trip.manifest && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Manifiesto:</Text>
              <Text style={styles.infoValue}>{trip.manifest.code}</Text>
            </View>
          )}
        </View>

        {/* Proveedor */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comprador</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nombre:</Text>
            <Text style={styles.infoValue}>{proveedorDisplay(proveedor)}</Text>
          </View>
          {proveedor.documentNumber && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Documento:</Text>
              <Text style={styles.infoValue}>
                {proveedor.documentType?.name} · {proveedor.documentNumber}
              </Text>
            </View>
          )}
          {proveedor.phone && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Teléfono:</Text>
              <Text style={styles.infoValue}>{proveedor.phone}</Text>
            </View>
          )}
        </View>

        {/* Reserva */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalle de la reserva</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Código:</Text>
            <Text style={styles.infoValue}>{shortCode}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Asientos:</Text>
            <Text style={styles.infoValue}>{reservation.seatCount}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pasajeros asignados:</Text>
            <Text style={styles.infoValue}>
              {passengers.length} de {reservation.seatCount}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Canal:</Text>
            <Text style={styles.infoValue}>{channelLabel}</Text>
          </View>
          {externalAgency && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Agencia:</Text>
              <Text style={styles.infoValue}>{proveedorDisplay(externalAgency)}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Precio cobrado:</Text>
            <Text style={styles.infoValue}>{priceFmt(reservation.priceAmount)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Precio sugerido:</Text>
            <Text style={styles.infoValue}>{priceFmt(reservation.suggestedAmount)}</Text>
          </View>
        </View>

        {/* Pasajeros */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pasajeros</Text>
          {passengers.length === 0 ? (
            <Text style={styles.emptyText}>
              Aún no se han asignado pasajeros a esta reserva.
            </Text>
          ) : (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.colBold, { flex: 3 }]}>Nombre</Text>
                <Text style={[styles.colBold, { flex: 2 }]}>Tipo Doc.</Text>
                <Text style={[styles.colBold, { flex: 2 }]}>Documento</Text>
                <Text style={[styles.colBold, { flex: 2 }]}>Nacionalidad</Text>
              </View>
              {passengers.map((rp, i) => (
                <View
                  key={i}
                  style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                >
                  <Text style={{ flex: 3 }}>
                    {rp.passenger.firstName} {rp.passenger.lastName}
                  </Text>
                  <Text style={{ flex: 2 }}>{rp.passenger.documentType.name}</Text>
                  <Text style={{ flex: 2 }}>{rp.passenger.documentNumber}</Text>
                  <Text style={{ flex: 2 }}>
                    {rp.passenger.country?.nationality ?? "—"}
                  </Text>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {shortCode} · Documento de uso interno — el comprador debe presentar
            este recibo el día del viaje
          </Text>
        </View>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibo-${shortCode}.pdf"`,
    },
  });
});
