import { HttpError, apiUser, handle, readJson, zodDetails } from "@/lib/api";
import { brandInputSchema } from "@/lib/brand";
import { prisma } from "@/lib/db";

export const POST = handle(async (request: Request) => {
  const user = await apiUser();
  const parsed = brandInputSchema.safeParse(await readJson(request));
  if (!parsed.success) throw new HttpError(422, "Invalid brand", zodDetails(parsed.error));
  const brand = await prisma.brand.create({ data: { ...parsed.data, logoUrl: parsed.data.logoUrl ?? null, userId: user.id } });
  return Response.json({ brand }, { status: 201 });
});
