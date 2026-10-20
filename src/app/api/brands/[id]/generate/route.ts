import { HttpError, apiBrand, handle, readJson, zodDetails } from "@/lib/api";
import { generateRequestSchema, runGeneration, type GenerationEvent } from "@/lib/generation";

// Batches stream back as they complete; allow long-running months on serverless hosts.
export const maxDuration = 300;

/**
 * Streams newline-delimited JSON (`application/x-ndjson`) GenerationEvents so
 * the UI can render posts week-by-week while the month is still generating.
 */
export const POST = handle(async (request: Request, ctx: RouteContext<"/api/brands/[id]/generate">) => {
  const brand = await apiBrand((await ctx.params).id);
  const parsed = generateRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) throw new HttpError(422, "Invalid request", zodDetails(parsed.error));

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const emit = (event: GenerationEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {
          open = false;
        }
      };
      try {
        await runGeneration(brand, parsed.data, emit, request.signal);
      } catch (err) {
        console.error("Generation failed", err);
        emit({ type: "error", message: err instanceof Error ? err.message : "Generation failed" });
      } finally {
        open = false;
        try {
          controller.close();
        } catch {
          // already closed by a client disconnect
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
});
