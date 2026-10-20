import { z } from "zod";
import { HttpError, apiBrand, handle, readJson, zodDetails } from "@/lib/api";
import { applyBrandUpdates, brandChat } from "@/lib/ai/brand";
import { brandInputSchema, toBrandProfile } from "@/lib/brand";

export const maxDuration = 60;

const bodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(40).default([]),
  /** The editor's current (possibly unsaved) values */
  draft: brandInputSchema.omit({ logoUrl: true }).optional(),
});

/** Conversational brand refinement. Returns proposed updates; the client decides whether to save. */
export const POST = handle(async (request: Request, ctx: RouteContext<"/api/brands/[id]/chat">) => {
  const brand = await apiBrand((await ctx.params).id);
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) throw new HttpError(422, "Invalid request", zodDetails(parsed.error));
  const { message, history, draft } = parsed.data;

  const current = draft ? { ...draft } : toBrandProfile(brand);
  const result = await brandChat(current, history, message);
  const next = applyBrandUpdates(current, result.updates);
  const changed = Object.entries(result.updates)
    .filter(([, v]) => v !== null)
    .map(([k]) => k);

  return Response.json({ reply: result.reply, draft: next, changed });
});
