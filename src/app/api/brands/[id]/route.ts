import { HttpError, apiBrand, handle, readJson, zodDetails } from "@/lib/api";
import { brandPatchSchema } from "@/lib/brand";
import { prisma } from "@/lib/db";

export const PATCH = handle(async (request: Request, ctx: RouteContext<"/api/brands/[id]">) => {
  const brand = await apiBrand((await ctx.params).id);
  const parsed = brandPatchSchema.safeParse(await readJson(request));
  if (!parsed.success) throw new HttpError(422, "Invalid brand", zodDetails(parsed.error));
  const updated = await prisma.brand.update({ where: { id: brand.id }, data: parsed.data });
  return Response.json({ brand: updated });
});

export const DELETE = handle(async (_request: Request, ctx: RouteContext<"/api/brands/[id]">) => {
  const brand = await apiBrand((await ctx.params).id);
  await prisma.brand.delete({ where: { id: brand.id } });
  return new Response(null, { status: 204 });
});
