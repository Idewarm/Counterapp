import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { BrandAvatar } from "@/components/brand/brand-avatar";
import { BrandNav } from "@/components/brand/brand-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { parseColors } from "@/lib/brand";
import { requireBrand } from "@/lib/session";

export default function BrandLayout({ children, params }: LayoutProps<"/brands/[id]">) {
  return (
    <div>
      <div className="border-b bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 pt-5">
          <Suspense fallback={<Skeleton className="mb-12 h-10 w-64" />}>
            <BrandHeader params={params} />
          </Suspense>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-6">{children}</div>
    </div>
  );
}

async function BrandHeader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { brand } = await requireBrand(id);
  if (!brand) notFound();
  const colors = parseColors(brand.colors);
  return (
    <>
      <Link href="/" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> All brands
      </Link>
      <div className="mb-4 flex items-center gap-3">
        <BrandAvatar name={brand.name} logoUrl={brand.logoUrl} color={colors.primary} size={44} />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">{brand.name}</h1>
          <div className="mt-1 flex gap-1">
            {[colors.primary, ...colors.secondary].map((c) => (
              <span key={c} className="size-3 rounded-full border" style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      </div>
      <BrandNav brandId={brand.id} />
    </>
  );
}
