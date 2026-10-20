import { HttpError, apiPost, handle, readJson, zodDetails } from "@/lib/api";
import { prisma } from "@/lib/db";
import { postPatchSchema, toPostDTO } from "@/lib/posts";

export const PATCH = handle(async (request: Request, ctx: RouteContext<"/api/posts/[id]">) => {
  const post = await apiPost((await ctx.params).id);
  const parsed = postPatchSchema.safeParse(await readJson(request));
  if (!parsed.success) throw new HttpError(422, "Invalid post", zodDetails(parsed.error));
  const updated = await prisma.contentPost.update({ where: { id: post.id }, data: parsed.data });
  return Response.json({ post: toPostDTO(updated) });
});

export const DELETE = handle(async (_request: Request, ctx: RouteContext<"/api/posts/[id]">) => {
  const post = await apiPost((await ctx.params).id);
  await prisma.contentPost.delete({ where: { id: post.id } });
  return new Response(null, { status: 204 });
});
