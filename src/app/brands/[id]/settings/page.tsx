import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BrandSettings } from "@/components/brand/brand-settings";
import { Skeleton } from "@/components/ui/skeleton";
import { parseColors } from "@/lib/brand";
import { requireBrand } from "@/lib/session";

export const metadata: Metadata = { title: "Brand settings" };

export default function SettingsPage({ params }: PageProps<"/brands/[id]/settings">) {
  return (
    <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
      <Settings params={params} />
    </Suspense>
  );
}

async function Settings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { brand } = await requireBrand(id);
  if (!brand) notFound();
  return (
    <BrandSettings
      brandId={brand.id}
      initial={{
        name: brand.name,
        logoUrl: brand.logoUrl,
        colors: parseColors(brand.colors),
        toneOfVoice: brand.toneOfVoice,
        targetAudience: brand.targetAudience,
        styleKeywords: brand.styleKeywords,
        description: brand.description,
      }}
    />
  );
}
