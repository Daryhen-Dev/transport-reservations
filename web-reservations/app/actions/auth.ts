"use server";

import { signOut } from "@/auth";

export async function signOutAction(redirectTo = "/login") {
  await signOut({ redirectTo });
}
