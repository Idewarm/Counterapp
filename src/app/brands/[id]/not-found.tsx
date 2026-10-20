import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function BrandNotFound() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <h2 className="text-xl font-semibold">Brand not found</h2>
      <p className="text-muted-foreground">It may have been deleted, or it belongs to another account.</p>
      <Button asChild>
        <Link href="/">Back to your brands</Link>
      </Button>
    </div>
  );
}
