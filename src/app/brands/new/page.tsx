import type { Metadata } from "next";
import { Suspense } from "react";
import { OnboardingWizard } from "@/components/brand/onboarding-wizard";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "New brand" };

export default function NewBrandPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Set up a new brand</h1>
        <p className="text-muted-foreground">Two quick steps: upload, then review what the AI extracted.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Gate />
      </Suspense>
    </div>
  );
}

async function Gate() {
  await requireUser();
  return <OnboardingWizard />;
}
