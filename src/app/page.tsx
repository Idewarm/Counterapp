import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, Palette, Plus, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandAvatar } from "@/components/brand/brand-avatar";
import { parseColors } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Home />
      </Suspense>
    </div>
  );
}

async function Home() {
  const user = await getCurrentUser();
  if (!user) return <Landing />;

  const brands = await prisma.brand.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { posts: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your brands</h1>
          <p className="text-muted-foreground">Pick a brand to edit its identity, generate content or open its calendar.</p>
        </div>
        <Button asChild>
          <Link href="/brands/new">
            <Plus /> New brand
          </Link>
        </Button>
      </div>

      {brands.length === 0 ? (
        <Card className="items-center border-dashed py-16 text-center">
          <CardHeader className="w-full justify-items-center">
            <CardTitle>No brands yet</CardTitle>
            <CardDescription>Upload a logo and let AI extract your brand identity in seconds.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/brands/new">
                <Upload /> Upload your logo
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => {
            const colors = parseColors(brand.colors);
            return (
              <Link key={brand.id} href={`/brands/${brand.id}/calendar`} className="group">
                <Card className="h-full gap-4 transition-shadow group-hover:shadow-md">
                  <CardHeader className="flex items-center gap-3">
                    <BrandAvatar name={brand.name} logoUrl={brand.logoUrl} color={colors.primary} />
                    <div className="min-w-0">
                      <CardTitle className="truncate">{brand.name}</CardTitle>
                      <CardDescription>{brand._count.posts} posts</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-1.5">
                      {[colors.primary, ...colors.secondary].map((c) => (
                        <span key={c} className="size-6 rounded-full border" style={{ backgroundColor: c }} title={c} />
                      ))}
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{brand.toneOfVoice || "No tone of voice yet."}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Landing() {
  const steps = [
    { icon: Upload, title: "Upload your logo", text: "GPT-4o vision extracts colours, tone of voice and style keywords." },
    { icon: Palette, title: "Refine your brand", text: "Tweak values by hand or just chat with the AI to adjust them." },
    { icon: Sparkles, title: "Generate a month", text: "Balanced, platform-native posts for TikTok, Instagram, Facebook and LinkedIn." },
    { icon: CalendarDays, title: "Edit & export", text: "Polish posts on a calendar, regenerate any of them, export CSV/JSON." },
  ];
  return (
    <div className="space-y-12 py-8">
      <section className="mx-auto max-w-2xl space-y-5 text-center">
        <div className="text-6xl" aria-hidden>
          🍌
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">From logo to a month of content.</h1>
        <p className="text-lg text-muted-foreground">
          Nano Banana turns your branding into an on-brand, multi-platform social media calendar — ready to edit and export.
        </p>
        <Button asChild size="lg">
          <Link href="/login">Get started — it&apos;s free</Link>
        </Button>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ icon: Icon, title, text }) => (
          <Card key={title} className="gap-3">
            <CardHeader>
              <Icon className="size-6 text-yellow-600 dark:text-primary" />
              <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{text}</CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
