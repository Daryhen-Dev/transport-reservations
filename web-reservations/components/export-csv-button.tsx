"use client"

import { IconFileDownload } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

type Props = {
  href: string
  label?: string
}

/**
 * Anchor disguised as a Button. The browser downloads the file because the
 * endpoint sets `Content-Disposition: attachment` — we don't need to manage
 * a fetch + Blob lifecycle here.
 */
export function ExportCsvButton({ href, label = "Exportar CSV" }: Props) {
  return (
    <Button variant="outline" size="sm" asChild title={label}>
      <a href={href} download>
        <IconFileDownload className="size-4" />
        <span className="hidden sm:inline">{label}</span>
      </a>
    </Button>
  )
}
