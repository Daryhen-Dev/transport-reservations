/**
 * Labels y helpers para los 4 tipos de proveedor.
 *
 * Los valores en DB son las claves (PERSONA, EMPRESA, AGENCIA,
 * INSTITUCION_PUBLICA). Esta capa los mapea a labels legibles + estilos.
 */

export const PROVEEDOR_TYPE_LABELS: Record<string, string> = {
  PERSONA: "Persona",
  EMPRESA: "Empresa",
  AGENCIA: "Agencia",
  INSTITUCION_PUBLICA: "Institución pública",
};

export function formatProveedorTypeName(name: string): string {
  return PROVEEDOR_TYPE_LABELS[name] ?? name;
}

/** PERSONA es el único tipo "natural" (no empresa). El resto se trata como entidad. */
export function isPersonaType(name: string): boolean {
  return name.toUpperCase() === "PERSONA";
}

/** Clases Tailwind por tipo para el badge. */
export const PROVEEDOR_TYPE_STYLES: Record<string, string> = {
  PERSONA: "bg-blue-100 text-blue-800 border-blue-200",
  EMPRESA: "bg-gray-100 text-gray-800 border-gray-200",
  AGENCIA: "bg-amber-100 text-amber-800 border-amber-200",
  INSTITUCION_PUBLICA: "bg-emerald-100 text-emerald-800 border-emerald-200",
};
