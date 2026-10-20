import type { Platform } from "@prisma/client";
import { PLATFORM_META } from "@/lib/platforms";
import { cn } from "@/lib/utils";

export function PlatformBadge({ platform, className }: { platform: Platform; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium", PLATFORM_META[platform].chip, className)}>
      {PLATFORM_META[platform].label}
    </span>
  );
}

export function PlatformDot({ platform, className }: { platform: Platform; className?: string }) {
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", PLATFORM_META[platform].dot, className)} aria-hidden />;
}
