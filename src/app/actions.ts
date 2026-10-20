"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clearSession, setSessionUser } from "@/lib/session";

const emailSchema = z.email().max(254).transform((v) => v.toLowerCase());

export interface SignInState {
  error?: string;
}

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = emailSchema.safeParse(String(formData.get("email") ?? "").trim());
  if (!parsed.success) return { error: "Please enter a valid email address." };
  const user = await prisma.user.upsert({ where: { email: parsed.data }, update: {}, create: { email: parsed.data } });
  await setSessionUser(user.id);
  redirect("/");
}

export async function signOut() {
  await clearSession();
  redirect("/login");
}
