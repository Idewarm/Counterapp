import { z } from "zod";
import { HttpError, apiPost, handle, readJson, zodDetails } from "@/lib/api";
import { regeneratePost } from "@/lib/ai/content";
import { toBrandProfile } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { toPostDTO } from "@/lib/posts";
import { parseMonth, monthKey } from "@/lib/schedule";

export const maxDuration = 60;

const bodySchema = z.object({ instruction: z.string().trim().max(500).optional() });

/** Rewrite one post with AI. The new version is saved and reset to DRAFT. */
export const POST = handle(async (request: Request, ctx: RouteContext<"/api/posts/[id]/regenerate">) => {
  const post = await apiPost((await ctx.params).id);
  const parsed = bodySchema.safeParse(await readJson(request).catch(() => ({})));
  if (!parsed.success) throw new HttpError(422, "Invalid request", zodDetails(parsed.error));

  const range = parseMonth(monthKey(post.scheduledDate))!;
  const neighbours = await prisma.contentPost.findMany({
    where: {
      brandId: post.brandId,
      platform: post.platform,
      id: { not: post.id },
      scheduledDate: { gte: range.start, lt: range.end },
    },
    select: { caption: true },
    take: 30,
  });

  const generated = await regeneratePost({
    brand: toBrandProfile(post.brand),
    platform: post.platform,
    date: post.scheduledDate,
    current: { caption: post.caption, pillar: post.pillar },
    otherCaptions: neighbours.map((n) => n.caption),
    instruction: parsed.data.instruction,
  });

  const updated = await prisma.contentPost.update({
    where: { id: post.id },
    data: { ...generated, status: "DRAFT" },
  });
  return Response.json({ post: toPostDTO(updated) });
});
