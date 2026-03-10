"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlus } from "@tabler/icons-react"
import { createBranch } from "@/app/actions/branch"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const schema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  slug: z
    .string()
    .min(2, "El slug debe tener al menos 2 caracteres")
    .regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
})

type FormValues = z.infer<typeof schema>

export function CreateBranchSheet({ currentSlug }: { currentSlug: string }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
  }

  async function onSubmit(data: FormValues) {
    const result = await createBranch({ ...data, currentSlug })
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success("Sucursal creada exitosamente")
    reset()
    setOpen(false)
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <IconPlus className="size-4" />
          Nueva sucursal
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Nueva sucursal</SheetTitle>
        </SheetHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 px-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              placeholder="Sucursal Norte"
              {...register("name", {
                onChange: (e) => setValue("slug", generateSlug(e.target.value)),
              })}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input
              id="slug"
              placeholder="sucursal-norte"
              {...register("slug")}
            />
            {errors.slug && (
              <p className="text-sm text-destructive">{errors.slug.message}</p>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creando..." : "Crear sucursal"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
