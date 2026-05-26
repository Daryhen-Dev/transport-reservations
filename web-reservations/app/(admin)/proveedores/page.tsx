import {
  getProveedores,
  getProveedorTypes,
  getDocumentTypes,
} from "@/lib/services/proveedor.service";
import { ProveedoresTable } from "./_components/proveedores-table";

export default async function ProveedoresPage() {
  const [proveedores, proveedorTypes, documentTypes] = await Promise.all([
    getProveedores(),
    getProveedorTypes(),
    getDocumentTypes(),
  ]);

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <ProveedoresTable
        data={proveedores}
        proveedorTypes={proveedorTypes}
        documentTypes={documentTypes}
      />
    </div>
  );
}
