import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

/**
 * Helpers de formateo de fechas. Centralizados para evitar hydration
 * mismatches que ocurren con toLocaleString cuando Node y el browser
 * usan ICU distintos (sobre todo con AM/PM en es-AR: NBSP vs espacio
 * normal entre "a." y "m.").
 *
 * Todos usan date-fns con locale es para garantizar output deterministico
 * entre server y client.
 */

export type DateInput = Date | string | number | null | undefined

function toDate(d: DateInput): Date | null {
  if (d === null || d === undefined) return null
  if (d instanceof Date) return d
  if (typeof d === "string") return parseISO(d)
  return new Date(d)
}

/**
 * "15 de jun de 2026, 07:30" — fecha completa con hora.
 * Usar en tablas y detalles donde el año importa.
 */
export function formatDateTime(d: DateInput): string {
  const date = toDate(d)
  if (!date) return ""
  return format(date, "d 'de' MMM 'de' yyyy, HH:mm", { locale: es })
}

/**
 * "15 jun, 07:30" — sin año.
 * Usar en contextos de "este viaje", manifiestos, etiquetas cortas.
 */
export function formatDateTimeShort(d: DateInput): string {
  const date = toDate(d)
  if (!date) return ""
  return format(date, "d MMM, HH:mm", { locale: es })
}

/**
 * "15 de jun de 2026" — fecha completa sin hora.
 * Usar para createdAt/updatedAt y ediciones.
 */
export function formatDate(d: DateInput): string {
  const date = toDate(d)
  if (!date) return ""
  return format(date, "d 'de' MMM 'de' yyyy", { locale: es })
}

/**
 * "miércoles, 15 de junio de 2026" — con día de la semana.
 * Usar en headers, dashboard, paginas con contexto temporal grande.
 */
export function formatDateWithWeekday(d: DateInput): string {
  const date = toDate(d)
  if (!date) return ""
  return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
}

/**
 * "15/06/2026" — formato numerico corto.
 * Usar para fecha de nacimiento y similares.
 */
export function formatDateNumeric(d: DateInput): string {
  const date = toDate(d)
  if (!date) return ""
  return format(date, "dd/MM/yyyy")
}

/**
 * "2026-06-15" — value para <input type="date">.
 * Usar al pre-llenar inputs de fecha en forms.
 */
export function formatDateForInput(d: DateInput): string {
  const date = toDate(d)
  if (!date) return ""
  return format(date, "yyyy-MM-dd")
}
