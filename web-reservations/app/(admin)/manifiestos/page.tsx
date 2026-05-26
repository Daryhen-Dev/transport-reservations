import { ManifestLookup } from "./_components/manifest-lookup"

export default async function ManifiestosPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold">Manifiestos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Buscá un manifiesto por código para ver los detalles del viaje o descargar el PDF.
        </p>
      </div>
      <ManifestLookup />
    </div>
  )
}
