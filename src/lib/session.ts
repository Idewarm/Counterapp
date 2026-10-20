import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";

/**
 * MVP identity: a passwordless, email-only sign-in that stores the user id in
 * an httpOnly cookie. Swap for a real auth provider (NextAuth/Auth.js, Clerk…)
 * before handling sensitive data — the rest of the app only depends on
 * `getCurrentUser()` / `requireUser()`.
 */
export const SESSION_COOKIE = "nb_uid";

export async function getCurrentUser() {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
}

/** For pages: redirect to sign-in when there is no user. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For pages: load a brand owned by the current user or 404. */
export async function requireBrand(brandId: string) {
  const user = await requireUser();
  const brand = await prisma.brand.findFirst({ where: { id: brandId, userId: user.id } });
  return { user, brand };
}

export async function setSessionUser(userId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
