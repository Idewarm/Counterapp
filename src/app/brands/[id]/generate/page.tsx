import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GenerateWorkflow } from "@/components/content/generate-workflow";
import { Skeleton } from "@/components/ui/skeleton";
import { aiMode } from "@/lib/ai/client";
import { requireBrand } from "@/lib/session";

export const metadata: Metadata = { title: "Generate content" };

export default function GeneratePage({ params }: PageProps<"/brands/[id]/generate">) {
  return (
    <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
      <Generate params={params} />
    </Suspense>
  );
}

async function Generate({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { brand } = await requireBrand(id);
  if (!brand) notFound();
  return <GenerateWorkflow brandId={brand.id} mockMode={aiMode() === "mock"} />;
}
