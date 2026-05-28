"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconPlus } from "@tabler/icons-react";
import { api, ApiError } from "@/lib/api/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z
  .object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string(),
    roleName: z.enum(["OWNER", "SUCURSAL_USER"]),
    branchId: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })
  .refine(
    (data) =>
      data.roleName === "OWNER" ||
      (typeof data.branchId === "string" && data.branchId.length > 0),
    {
      message: "Debe seleccionar una sucursal",
      path: ["branchId"],
    }
  );

type FormValues = z.infer<typeof schema>;

type Branch = { id: string; name: string };

export function CreateUserSheet({ branches }: { branches: Branch[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { roleName: "SUCURSAL_USER" },
  });

  const roleName = watch("roleName");
  const isOwner = roleName === "OWNER";

  async function onSubmit(data: FormValues) {
    const { confirmPassword: _ignored, ...rest } = data;
    void _ignored;
    const payload = {
      name: rest.name,
      email: rest.email,
      password: rest.password,
      roleName: rest.roleName,
      branchId: rest.roleName === "OWNER" ? null : rest.branchId!,
    };
    try {
      await api.users.create(payload);
      toast.success("Usuario creado exitosamente");
      reset({ roleName: "SUCURSAL_USER" });
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Error al crear el usuario");
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <IconPlus className="size-4" />
          Nuevo usuario
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Nuevo usuario</SheetTitle>
        </SheetHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 px-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Juan Pérez" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="juan@agencia.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="roleName">Rol</Label>
            <Select
              defaultValue="SUCURSAL_USER"
              onValueChange={(val) => {
                setValue("roleName", val as "OWNER" | "SUCURSAL_USER", {
                  shouldValidate: true,
                });
                if (val === "OWNER") {
                  setValue("branchId", undefined, { shouldValidate: true });
                }
              }}
            >
              <SelectTrigger id="roleName" className="w-full">
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OWNER">Owner (acceso total)</SelectItem>
                <SelectItem value="SUCURSAL_USER">
                  Sucursal (acceso a su sucursal)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!isOwner && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="branchId">Sucursal</Label>
              <Select
                onValueChange={(val) =>
                  setValue("branchId", val, { shouldValidate: true })
                }
              >
                <SelectTrigger id="branchId" className="w-full">
                  <SelectValue placeholder="Seleccionar sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.branchId && (
                <p className="text-sm text-destructive">
                  {errors.branchId.message}
                </p>
              )}
            </div>
          )}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creando..." : "Crear usuario"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
