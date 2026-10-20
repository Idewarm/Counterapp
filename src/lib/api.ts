import "server-only";
import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { prisma } from "./db";
import { getCurrentUser } from "./session";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status });
}

export function zodDetails(error: ZodError) {
  return error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
}

/** Wrap a route handler so thrown HttpErrors become JSON responses. */
export function handle<Args extends unknown[]>(fn: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) return jsonError(err.status, err.message, err.details);
      console.error(err);
      const message = err instanceof Error ? err.message : "Unexpected error";
      return jsonError(500, process.env.NODE_ENV === "production" ? "Unexpected error" : message);
    }
  };
}

export async function apiUser() {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Not signed in");
  return user;
}

export async function apiBrand(brandId: string) {
  const user = await apiUser();
  const brand = await prisma.brand.findFirst({ where: { id: brandId, userId: user.id } });
  if (!brand) throw new HttpError(404, "Brand not found");
  return brand;
}

export async function apiPost(postId: string) {
  const user = await apiUser();
  const post = await prisma.contentPost.findFirst({
    where: { id: postId, brand: { userId: user.id } },
    include: { brand: true },
  });
  if (!post) throw new HttpError(404, "Post not found");
  return post;
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}
