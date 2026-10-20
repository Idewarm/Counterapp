import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function BrandIndexPage({ params }: PageProps<"/brands/[id]">) {
  return (
    <Suspense fallback={null}>
      <RedirectToCalendar params={params} />
    </Suspense>
  );
}

async function RedirectToCalendar({ params }: { params: Promise<{ id: string }> }): Promise<never> {
  const { id } = await params;
  redirect(`/brands/${id}/calendar`);
}
