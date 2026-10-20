import { HttpError, apiUser, handle } from "@/lib/api";
import { extractBrandFromImage } from "@/lib/ai/brand";
import { aiMode } from "@/lib/ai/client";
import { UploadError, storeImage } from "@/lib/uploads";

export const maxDuration = 60;

/** Upload a logo/brand image and extract colours + tone with the vision model. */
export const POST = handle(async (request: Request) => {
  await apiUser();
  const form = await request.formData().catch(() => {
    throw new HttpError(400, "Expected multipart form data");
  });
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Missing file");

  let stored;
  try {
    stored = await storeImage(file);
  } catch (err) {
    if (err instanceof UploadError) throw new HttpError(400, err.message);
    throw err;
  }

  const extraction = await extractBrandFromImage({
    image: stored.buffer,
    mimeType: stored.mimeType,
    brandName: String(form.get("name") ?? "").slice(0, 100) || undefined,
    context: String(form.get("context") ?? "").slice(0, 1000) || undefined,
  });

  return Response.json({ logoUrl: stored.url, extraction, mode: aiMode() });
});
