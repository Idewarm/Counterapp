import { z } from "zod";
import { HttpError, apiBrand, handle, readJson, zodDetails } from "@/lib/api";
import { prisma } from "@/lib/db";
import { PLATFORMS } from "@/lib/platforms";
import { normalizeHashtags, toPostDTO } from "@/lib/posts";
import { parseMonth } from "@/lib/schedule";

export const GET = handle(async (request: Request, ctx: RouteContext<"/api/brands/[id]/posts">) => {
  const brand = await apiBrand((await ctx.params).id);
  const range = parseMonth(new URL(request.url).searchParams.get("month"));
  if (!range) throw new HttpError(400, "Query parameter `month` (YYYY-MM) is required");
  const posts = await prisma.contentPost.findMany({
    where: { brandId: brand.id, scheduledDate: { gte: range.start, lt: range.end } },
    orderBy: [{ scheduledDate: "asc" }, { platform: "asc" }],
  });
  return Response.json({ posts: posts.map(toPostDTO) });
});

const createSchema = z.object({
  platform: z.enum(PLATFORMS),
  scheduledDate: z.iso.datetime({ offset: true }).transform((v) => new Date(v)),
  caption: z.string().max(5000).default(""),
  hashtags: z.union([z.array(z.string()), z.string()]).default([]).transform(normalizeHashtags),
  visualConcept: z.string().max(5000).default(""),
  pillar: z.string().max(100).default(""),
});

/** Manually add a post to the calendar. */
export const POST = handle(async (request: Request, ctx: RouteContext<"/api/brands/[id]/posts">) => {
  const brand = await apiBrand((await ctx.params).id);
  const parsed = createSchema.safeParse(await readJson(request));
  if (!parsed.success) throw new HttpError(422, "Invalid post", zodDetails(parsed.error));
  const post = await prisma.contentPost.create({ data: { ...parsed.data, brandId: brand.id } });
  return Response.json({ post: toPostDTO(post) }, { status: 201 });
});
