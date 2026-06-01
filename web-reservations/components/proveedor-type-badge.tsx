import {
  formatProveedorTypeName,
  PROVEEDOR_TYPE_STYLES,
} from "@/lib/proveedor-types"

export function ProveedorTypeBadge({ name }: { name: string }) {
  const label = formatProveedorTypeName(name)
  const styles =
    PROVEEDOR_TYPE_STYLES[name] ??
    "bg-gray-100 text-gray-800 border-gray-200"
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles}`}
    >
      {label}
    </span>
  )
}
