"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

const createUserSchema = z
  .object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string(),
    branchId: z.string().min(1, "Debe seleccionar una sucursal"),
    currentSlug: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export async function createUser(data: unknown) {
  const parsed = createUserSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { name, email, password, branchId, currentSlug } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "El email ya está en uso" };

  const sucursalUserRole = await prisma.role.findUnique({
    where: { name: "SUCURSAL_USER" },
  });
  if (!sucursalUserRole) return { error: "Rol no encontrado" };

  try {
    await prisma.user.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, 12),
        roleId: sucursalUserRole.id,
        branchId,
      },
    });
    revalidatePath(`/${currentSlug}/usuarios`);
    return { success: true };
  } catch {
    return { error: "Error al crear el usuario" };
  }
}
