"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Platform } from "@prisma/client";
import { AlertTriangle, CalendarDays, CheckCircle2, Loader2, Sparkles, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { readNdjson } from "@/lib/client-api";
import { PLATFORM_META, PLATFORMS } from "@/lib/platforms";
import type { PostDTO } from "@/lib/posts";
import { currentMonthKey, formatMonthLabel, parseMonth, platformSlots, shiftMonth, weekChunks } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { PlatformBadge } from "./platform-badge";

type GenerationEvent =
  | { type: "start"; totalBatches: number; totalSlots: number; skippedSlots: number; deleted: number }
  | { type: "strategy"; strategy: { pillars: { name: string; description: string }[]; weeklyThemes: { week: number; theme: string; focus: string }[] } }
  | { type: "batch"; platform: Platform; week: number; posts: PostDTO[]; completed: number; totalBatches: number }
  | { type: "batch_error"; platform: Platform; week: number; message: string; completed: number; totalBatches: number }
  | { type: "done"; created: number; failedBatches: number }
  | { type: "error"; message: string };

type BatchState = "pending" | "done" | "error";

export function GenerateWorkflow({ brandId, mockMode }: { brandId: string; mockMode: boolean }) {
  const [month, setMonth] = useState(() => shiftMonth(currentMonthKey(), 1));
  const [selected, setSelected] = useState<Platform[]>(["INSTAGRAM", "TIKTOK"]);
  const [perWeek, setPerWeek] = useState<Record<Platform, number>>(
    () => Object.fromEntries(PLATFORMS.map((p) => [p, PLATFORM_META[p].defaultWeekdays.length])) as Record<Platform, number>,
  );
  const [notes, setNotes] = useState("");
  const [replaceDrafts, setReplaceDrafts] = useState(false);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
  const [strategy, setStrategy] = useState<Extract<GenerationEvent, { type: "strategy" }>["strategy"] | null>(null);
  const [batches, setBatches] = useState<Record<string, BatchState>>({});
  const [posts, setPosts] = useState<PostDTO[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const range = useMemo(() => parseMonth(month), [month]);
  const weeks = useMemo(() => (range ? weekChunks(range) : []), [range]);
  const estimate = useMemo(
    () => (range ? selected.reduce((n, p) => n + platformSlots(p, range.start, range.end, perWeek[p]).length, 0) : 0),
    [range, selected, perWeek],
  );

  function toggle(p: Platform) {
    setSelected((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));
  }

  async function start() {
    if (!range || selected.length === 0) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setStrategy(null);
    setPosts([]);
    setSummary(null);
    setProgress(null);
    setBatches(Object.fromEntries(selected.flatMap((p) => weeks.map((w) => [`${p}|${w.index + 1}`, "pending" as BatchState]))));

    try {
      const res = await fetch(`/api/brands/${brandId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          platforms: selected,
          postsPerWeek: Object.fromEntries(selected.map((p) => [p, perWeek[p]])),
          replaceDrafts,
          notes: notes.trim() || undefined,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }

      await readNdjson<GenerationEvent>(res, (event) => {
        switch (event.type) {
          case "start":
            setProgress({ completed: 0, total: event.totalBatches });
            if (event.skippedSlots) toast.info(`${event.skippedSlots} slot(s) already had posts and were skipped.`);
            // Weeks/platforms with no free slots never get a batch — mark them done.
            if (event.totalBatches === 0) setBatches({});
            break;
          case "strategy":
            setStrategy(event.strategy);
            break;
          case "batch":
            setProgress({ completed: event.completed, total: event.totalBatches });
            setBatches((b) => ({ ...b, [`${event.platform}|${event.week}`]: "done" }));
            setPosts((p) => [...p, ...event.posts].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)));
            break;
          case "batch_error":
            setProgress({ completed: event.completed, total: event.totalBatches });
            setBatches((b) => ({ ...b, [`${event.platform}|${event.week}`]: "error" }));
            toast.error(`${PLATFORM_META[event.platform].label} week ${event.week} failed: ${event.message}`);
            break;
          case "done":
            setBatches((b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v === "pending" ? "done" : v])));
            setSummary(
              event.created === 0 && event.failedBatches === 0
                ? "Nothing to generate — every slot in this month already has a post. Tick “Replace existing drafts” to regenerate."
                : `Created ${event.created} posts${event.failedBatches ? ` (${event.failedBatches} batch(es) failed — run again to fill the gaps)` : ""}.`,
            );
            if (event.created) toast.success(`Generated ${event.created} posts!`);
            break;
          case "error":
            throw new Error(event.message);
        }
      });
    } catch (err) {
      if (controller.signal.aborted) {
        setSummary("Generation stopped. Posts generated so far were saved.");
      } else {
        toast.error(err instanceof Error ? err.message : "Generation failed");
        setSummary("Generation failed. Posts generated so far were saved.");
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  const pct = progress && progress.total ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Generate a content calendar</CardTitle>
          <CardDescription>A balanced month of posts, generated platform-by-platform and week-by-week.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          {mockMode && (
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              Mock AI mode: set <code>OPENAI_API_KEY</code> to generate real content. Sample posts will be created instead.
            </p>
          )}
          <div className="grid gap-2">
            <Label htmlFor="month">Month</Label>
            <Input id="month" type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} disabled={running} />
          </div>
          <div className="grid gap-2">
            <Label>Platforms & posts per week</Label>
            <div className="grid gap-2">
              {PLATFORMS.map((p) => {
                const on = selected.includes(p);
                return (
                  <div key={p} className={cn("flex items-center justify-between gap-3 rounded-lg border p-2.5 transition-colors", on && "border-primary bg-primary/5")}>
                    <label className="flex flex-1 cursor-pointer items-center gap-3">
                      <Checkbox checked={on} onCheckedChange={() => toggle(p)} disabled={running} />
                      <PlatformBadge platform={p} />
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={7}
                      aria-label={`${PLATFORM_META[p].label} posts per week`}
                      value={perWeek[p]}
                      disabled={!on || running}
                      onChange={(e) => setPerWeek((s) => ({ ...s, [p]: Math.min(7, Math.max(1, Number(e.target.value) || 1)) }))}
                      className="h-8 w-16"
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">
              Campaign notes <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              rows={3}
              maxLength={1000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={running}
              placeholder="e.g. New autumn menu launches on the 15th; Black Friday promo in the last week."
            />
          </div>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <Checkbox checked={replaceDrafts} onCheckedChange={(v) => setReplaceDrafts(v === true)} disabled={running} className="mt-0.5" />
            <span>
              Replace existing drafts
              <span className="block text-muted-foreground">Approved posts are always kept. Otherwise only empty slots are filled.</span>
            </span>
          </label>
          <div className="flex items-center justify-between gap-3 border-t pt-4">
            <span className="text-sm text-muted-foreground">
              ≈ {estimate} posts · {formatMonthLabel(month)}
            </span>
            {running ? (
              <Button variant="outline" onClick={() => abortRef.current?.abort()}>
                <Square /> Stop
              </Button>
            ) : (
              <Button onClick={start} disabled={selected.length === 0 || !range}>
                <Sparkles /> Generate
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {!running && !progress && (
          <Card className="items-center border-dashed py-16 text-center">
            <CardContent className="space-y-2">
              <Sparkles className="mx-auto size-8 text-muted-foreground" />
              <p className="font-medium">Your posts will appear here as they&apos;re generated.</p>
              <p className="text-sm text-muted-foreground">First a monthly strategy, then each platform week-by-week.</p>
            </CardContent>
          </Card>
        )}

        {progress && (
          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {running ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4 text-green-600" />}
                {running ? (strategy ? "Writing posts…" : "Planning the month…") : "Finished"}
              </CardTitle>
              <CardDescription>
                {progress.completed} / {progress.total} batches · {posts.length} posts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={pct} />
              <div className="overflow-x-auto">
                <table className="text-xs">
                  <thead>
                    <tr>
                      <th />
                      {weeks.map((w) => (
                        <th key={w.index} className="px-2 pb-1 font-medium text-muted-foreground">
                          W{w.index + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selected.map((p) => (
                      <tr key={p}>
                        <td className="pr-3 py-0.5">
                          <PlatformBadge platform={p} />
                        </td>
                        {weeks.map((w) => {
                          const state = batches[`${p}|${w.index + 1}`];
                          return (
                            <td key={w.index} className="px-2 text-center">
                              {state === "done" ? (
                                <CheckCircle2 className="mx-auto size-4 text-green-600" />
                              ) : state === "error" ? (
                                <AlertTriangle className="mx-auto size-4 text-destructive" />
                              ) : running ? (
                                <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" />
                              ) : (
                                <span className="text-muted-foreground">–</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {summary && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted p-3 text-sm">
                  <span>{summary}</span>
                  <Button asChild size="sm">
                    <Link href={`/brands/${brandId}/calendar?month=${month}`}>
                      <CalendarDays /> Open calendar
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {strategy && (
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Monthly strategy</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Content pillars</p>
                {strategy.pillars.map((p) => (
                  <div key={p.name} className="text-sm">
                    <span className="font-medium">{p.name}</span> — <span className="text-muted-foreground">{p.description}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Weekly themes</p>
                {strategy.weeklyThemes.map((t) => (
                  <div key={t.week} className="text-sm">
                    <span className="font-medium">
                      Week {t.week}: {t.theme}
                    </span>{" "}
                    — <span className="text-muted-foreground">{t.focus}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {posts.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {posts.map((post) => (
              <Card key={post.id} className="gap-2 py-4 animate-in fade-in slide-in-from-bottom-2">
                <CardHeader className="flex flex-row items-center justify-between gap-2 px-4">
                  <PlatformBadge platform={post.platform} />
                  <span className="text-xs text-muted-foreground">
                    {new Date(post.scheduledDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}
                  </span>
                </CardHeader>
                <CardContent className="space-y-2 px-4 text-sm">
                  <p className="line-clamp-4 whitespace-pre-wrap">{post.caption}</p>
                  <p className="line-clamp-1 text-xs text-sky-700 dark:text-sky-400">{post.hashtags.map((h) => `#${h}`).join(" ")}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
