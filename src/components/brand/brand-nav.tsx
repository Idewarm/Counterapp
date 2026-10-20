"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Palette, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandNav({ brandId }: { brandId: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/brands/${brandId}/calendar`, label: "Calendar", icon: CalendarDays },
    { href: `/brands/${brandId}/generate`, label: "Generate", icon: Sparkles },
    { href: `/brands/${brandId}/settings`, label: "Brand settings", icon: Palette },
  ];
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
              active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
