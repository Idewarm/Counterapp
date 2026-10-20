"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Platform } from "@prisma/client";
import { CheckCircle2, ChevronLeft, ChevronRight, LayoutGrid, List, Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/client-api";
import { PLATFORM_META, PLATFORMS } from "@/lib/platforms";
import type { PostDTO } from "@/lib/posts";
import { calendarCells, currentMonthKey, formatMonthLabel, isoDay, parseMonth, shiftMonth } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { ExportDialog } from "./export-dialog";
import { PlatformBadge, PlatformDot } from "./platform-badge";
import { PostEditor, type EditorTarget } from "./post-editor";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
type StatusFilter = "ALL" | "DRAFT" | "APPROVED";

const fmtTime = (iso: string) => iso.slice(11, 16);

export function CalendarView({ brandId, brandName, initialMonth }: { brandId: string; brandName: string; initialMonth: string }) {
  const [month, setMonth] = useState(initialMonth);
  const [posts, setPosts] = useState<PostDTO[]>([]);
  const [loadedMonth, setLoadedMonth] = useState<string | null>(null);
  const loading = loadedMonth !== month;
  const [platforms, setPlatforms] = useState<Platform[]>([...PLATFORMS]);
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [editing, setEditing] = useState<EditorTarget | null>(null);

  const range = useMemo(() => parseMonth(month)!, [month]);

  useEffect(() => {
    let cancelled = false;
    api<{ posts: PostDTO[] }>(`/api/brands/${brandId}/posts?month=${month}`)
      .then((data) => {
        if (cancelled) return;
        setPosts(data.posts);
        setLoadedMonth(month);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : "Could not load posts");
        setPosts([]);
        setLoadedMonth(month);
      });
    // Keep the month in the URL so it survives reloads and can be shared.
    window.history.replaceState(null, "", `?month=${month}`);
    return () => {
      cancelled = true;
    };
  }, [brandId, month]);

  const visible = useMemo(
    () => posts.filter((p) => platforms.includes(p.platform) && (status === "ALL" || p.status === status)),
    [posts, platforms, status],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, PostDTO[]>();
    for (const p of visible) {
      const day = p.scheduledDate.slice(0, 10);
      map.set(day, [...(map.get(day) ?? []), p]);
    }
    for (const list of map.values()) list.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    return map;
  }, [visible]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(PLATFORMS.map((p) => [p, 0])) as Record<Platform, number>;
    for (const p of posts) c[p.platform]++;
    return c;
  }, [posts]);
  const approved = posts.filter((p) => p.status === "APPROVED").length;

  function upsertLocal(post: PostDTO) {
    if (post.scheduledDate.slice(0, 7) !== month) {
      setPosts((list) => list.filter((p) => p.id !== post.id));
      return;
    }
    setPosts((list) => {
      const exists = list.some((p) => p.id === post.id);
      const next = exists ? list.map((p) => (p.id === post.id ? post : p)) : [...list, post];
      return next.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    });
  }

  const today = isoDay(new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
            <ChevronLeft />
          </Button>
          <h2 className="min-w-44 text-center text-lg font-semibold">{formatMonthLabel(month)}</h2>
          <Button variant="outline" size="icon" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">
            <ChevronRight />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setMonth(currentMonthKey())}>
            Today
          </Button>
          {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border p-0.5">
            <Button variant={view === "grid" ? "secondary" : "ghost"} size="sm" onClick={() => setView("grid")} aria-label="Month grid">
              <LayoutGrid />
            </Button>
            <Button variant={view === "list" ? "secondary" : "ghost"} size="sm" onClick={() => setView("list")} aria-label="List">
              <List />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing({ mode: "create", date: `${month}-01` })}>
            <Plus /> Add post
          </Button>
          <ExportDialog brandId={brandId} brandName={brandName} month={month} platforms={platforms} status={status} total={visible.length} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {PLATFORMS.map((p) => {
            const on = platforms.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPlatforms((s) => (on ? s.filter((x) => x !== p) : [...s, p]))}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity",
                  !on && "opacity-40",
                )}
                aria-pressed={on}
              >
                <PlatformDot platform={p} /> {PLATFORM_META[p].label}
                <span className="text-muted-foreground">{counts[p]}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">
            {approved}/{posts.length} approved
          </span>
          <div className="flex rounded-md border p-0.5">
            {(["ALL", "DRAFT", "APPROVED"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn("rounded px-2 py-1 font-medium capitalize", status === s ? "bg-secondary" : "text-muted-foreground")}
              >
                {s.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!loading && posts.length === 0 && (
        <Card className="items-center border-dashed py-10 text-center">
          <CardContent className="space-y-3">
            <p className="font-medium">No posts in {formatMonthLabel(month)} yet.</p>
            <Button asChild>
              <Link href={`/brands/${brandId}/generate`}>
                <Sparkles /> Generate this month
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {view === "grid" ? (
        <div className="overflow-x-auto">
          <div className="grid min-w-[760px] grid-cols-7 overflow-hidden rounded-xl border bg-border gap-px">
            {WEEKDAYS.map((d) => (
              <div key={d} className="bg-muted px-2 py-1.5 text-xs font-medium text-muted-foreground">
                {d}
              </div>
            ))}
            {calendarCells(range).map((date, i) => {
              if (!date) return <div key={`blank-${i}`} className="min-h-32 bg-muted/40" />;
              const key = isoDay(date);
              const dayPosts = byDay.get(key) ?? [];
              return (
                <div key={key} className="group min-h-32 bg-card p-1.5">
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                        key === today && "bg-primary text-primary-foreground",
                      )}
                    >
                      {date.getUTCDate()}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditing({ mode: "create", date: key })}
                      className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent focus:opacity-100"
                      aria-label={`Add post on ${key}`}
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {dayPosts.map((post) => (
                      <button
                        key={post.id}
                        type="button"
                        onClick={() => setEditing({ mode: "edit", post })}
                        className="flex w-full items-center gap-1.5 rounded-md border bg-background px-1.5 py-1 text-left text-xs hover:border-primary hover:bg-accent"
                        title={post.caption}
                      >
                        <PlatformDot platform={post.platform} />
                        <span className="truncate">{post.caption || "(empty caption)"}</span>
                        {post.status === "APPROVED" && <CheckCircle2 className="ml-auto size-3 shrink-0 text-green-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {[...byDay.entries()].map(([day, list]) => (
            <div key={day}>
              <h3 className="mb-2 text-sm font-semibold">
                {new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}
              </h3>
              <div className="grid gap-2 md:grid-cols-2">
                {list.map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => setEditing({ mode: "edit", post })}
                    className="space-y-2 rounded-xl border bg-card p-3 text-left text-sm hover:border-primary"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <PlatformBadge platform={post.platform} />
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        {fmtTime(post.scheduledDate)}
                        {post.status === "APPROVED" ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="size-3" /> Approved
                          </span>
                        ) : (
                          <span>· Draft</span>
                        )}
                      </span>
                    </div>
                    <p className="line-clamp-3 whitespace-pre-wrap">{post.caption}</p>
                    <p className="line-clamp-1 text-xs text-sky-700 dark:text-sky-400">{post.hashtags.map((h) => `#${h}`).join(" ")}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <PostEditor
        brandId={brandId}
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={(post) => {
          upsertLocal(post);
          setEditing((e) => (e ? { mode: "edit", post } : e));
        }}
        onDeleted={(id) => {
          setPosts((list) => list.filter((p) => p.id !== id));
          setEditing(null);
        }}
      />
    </div>
  );
}
