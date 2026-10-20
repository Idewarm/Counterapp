import { HttpError, apiBrand, handle } from "@/lib/api";
import { prisma } from "@/lib/db";
import { toCSV, toJSON, toText, type ExportFormat } from "@/lib/export";
import { isPlatform } from "@/lib/platforms";
import { formatMonthLabel, parseMonth } from "@/lib/schedule";

const FORMATS: Record<ExportFormat, string> = {
  csv: "text/csv; charset=utf-8",
  json: "application/json; charset=utf-8",
  txt: "text/plain; charset=utf-8",
};

/** GET /api/brands/:id/export?month=2026-11&format=csv|json|txt[&platforms=TIKTOK,INSTAGRAM][&status=APPROVED] */
export const GET = handle(async (request: Request, ctx: RouteContext<"/api/brands/[id]/export">) => {
  const brand = await apiBrand((await ctx.params).id);
  const params = new URL(request.url).searchParams;
  const range = parseMonth(params.get("month"));
  if (!range) throw new HttpError(400, "Query parameter `month` (YYYY-MM) is required");
  const format = (params.get("format") ?? "csv") as ExportFormat;
  if (!(format in FORMATS)) throw new HttpError(400, "format must be csv, json or txt");
  const platforms = (params.get("platforms") ?? "").split(",").filter(isPlatform);
  const status = params.get("status");

  const posts = await prisma.contentPost.findMany({
    where: {
      brandId: brand.id,
      scheduledDate: { gte: range.start, lt: range.end },
      ...(platforms.length ? { platform: { in: platforms } } : {}),
      ...(status === "APPROVED" || status === "DRAFT" ? { status } : {}),
    },
    orderBy: [{ scheduledDate: "asc" }, { platform: "asc" }],
  });

  const body =
    format === "csv" ? toCSV(posts) : format === "json" ? toJSON(brand.name, range.key, posts) : toText(brand.name, formatMonthLabel(range.key), posts);
  const slug = brand.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "brand";

  return new Response(body, {
    headers: {
      "Content-Type": FORMATS[format],
      "Content-Disposition": `attachment; filename="${slug}-${range.key}-calendar.${format}"`,
      "Cache-Control": "no-store",
    },
  });
});
