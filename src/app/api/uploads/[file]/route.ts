import { jsonError } from "@/lib/api";
import { readUpload } from "@/lib/uploads";

export async function GET(_req: Request, ctx: RouteContext<"/api/uploads/[file]">) {
  const { file } = await ctx.params;
  const upload = await readUpload(file);
  if (!upload) return jsonError(404, "Not found");
  return new Response(new Uint8Array(upload.buffer), {
    headers: {
      "Content-Type": upload.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
