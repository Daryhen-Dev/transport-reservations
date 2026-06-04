/**
 * Tarifas globales fijas. El precio se determina por el tipo de venta
 * (PriceType), no por la ruta. Si el negocio necesita cambiar estas
 * tarifas en el futuro, se mueven a una tabla de configuracion.
 */

export const PRICE_NORMAL = 30
export const PRICE_REFERIDOS = 30
export const COMMISSION_PER_PAX = 5
export const PRICE_LIBRE_MIN = 20
export const PRICE_LIBRE_MAX = 30

/**
 * Comision fija por pasajero que cobramos cuando transferimos una reserva
 * a otra agencia (estado TRANSFERIDA). El resto del dinero cobrado se le
 * envia a la agencia destino.
 */
export const TRANSFER_COMMISSION_PER_PAX = 5

export const PRICE_TYPES = ["NORMAL", "REFERIDOS", "LIBRE"] as const
export type PriceType = (typeof PRICE_TYPES)[number]

export function isPriceType(value: unknown): value is PriceType {
  return typeof value === "string" && (PRICE_TYPES as readonly string[]).includes(value)
}

/**
 * Precio efectivo cobrado por pasajero segun tipo. Para LIBRE el usuario
 * decide; devolvemos null para que el caller use el valor que ingreso.
 */
export function priceForType(type: PriceType): number | null {
  switch (type) {
    case "NORMAL":
      return PRICE_NORMAL
    case "REFERIDOS":
      return PRICE_REFERIDOS
    case "LIBRE":
      return null
  }
}

/**
 * Comision a pagar a la agencia referidora por pasajero. Solo REFERIDOS
 * paga comision; el resto devuelve 0.
 */
export function commissionPerPaxForType(type: PriceType): number {
  return type === "REFERIDOS" ? COMMISSION_PER_PAX : 0
}

/**
 * Pre-seleccion del tipo de precio segun el tipo del proveedor comprador.
 * AGENCIA → REFERIDOS LOCKED. PERSONA / INSTITUCION_PUBLICA → NORMAL editable
 * (puede pasar a LIBRE; REFERIDOS no aplica porque la agencia referidora
 * tiene que ser el proveedor mismo).
 */
export function defaultPriceTypeForProveedor(proveedorTypeName: string | null | undefined): PriceType {
  return proveedorTypeName === "AGENCIA" ? "REFERIDOS" : "NORMAL"
}

export function isPriceTypeLockedForProveedor(proveedorTypeName: string | null | undefined): boolean {
  return proveedorTypeName === "AGENCIA"
}

/**
 * Opciones de tipo de precio disponibles segun el tipo de proveedor.
 * AGENCIA solo puede REFERIDOS. Los demas solo NORMAL o LIBRE — REFERIDOS
 * no aplica porque no hay agencia referidora.
 */
export function allowedPriceTypesForProveedor(proveedorTypeName: string | null | undefined): readonly PriceType[] {
  if (proveedorTypeName === "AGENCIA") return ["REFERIDOS"]
  return ["NORMAL", "LIBRE"]
}

/**
 * Calcula el desglose monetario cuando transferimos una reserva a otra
 * agencia. priceAmount es el precio por pasajero que el cliente nos pago
 * (snapshot historico en la reserva). Devuelve los totales para guardar
 * como snapshot en PassengerReservation.
 */
export function transferBreakdown(priceAmount: number, seatCount: number): {
  amountToAgency: number
  commissionEarned: number
} {
  const commissionEarned = TRANSFER_COMMISSION_PER_PAX * seatCount
  const totalCharged = priceAmount * seatCount
  return {
    amountToAgency: totalCharged - commissionEarned,
    commissionEarned,
  }
}
