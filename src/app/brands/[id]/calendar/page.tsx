import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CalendarView } from "@/components/content/calendar-view";
import { Skeleton } from "@/components/ui/skeleton";
import { requireBrand } from "@/lib/session";
import { currentMonthKey, parseMonth } from "@/lib/schedule";

export const metadata: Metadata = { title: "Content calendar" };

export default function CalendarPage({ params, searchParams }: PageProps<"/brands/[id]/calendar">) {
  return (
    <Suspense fallback={<Skeleton className="h-[700px] w-full" />}>
      <Calendar params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Calendar({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { brand } = await requireBrand(id);
  if (!brand) notFound();
  const requested = typeof query.month === "string" ? query.month : null;
  const month = parseMonth(requested) ? requested! : currentMonthKey();
  return <CalendarView brandId={brand.id} brandName={brand.name} initialMonth={month} />;
}
