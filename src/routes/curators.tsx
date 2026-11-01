import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { curatorsQuery, fmt, itemsQuery, metricsOf, savesQuery } from "@/lib/xtrnd";

export const Route = createFileRoute("/curators")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Curator Leaderboard — Xtrnd" },
      { name: "description", content: "Top Xtrnd curators surfacing the highest-signal content on X.com." },
      { property: "og:title", content: "Curator Leaderboard — Xtrnd" },
      { property: "og:description", content: "Top Xtrnd curators surfacing the highest-signal content on X.com." },
    ],
  }),
  component: Curators,
});

function Curators() {
  const { data: curators = [], isLoading } = useQuery(curatorsQuery);
  const { data: items = [] } = useQuery(itemsQuery);
  const { data: saves = {} } = useQuery(savesQuery);

  const rows = useMemo(() => curators.map((c) => {
    const mine = items.filter((i) => i.submitted_by === c.id);
    const views = mine.reduce((s, i) => s + (metricsOf(i).views ?? 0), 0);
    const saved = mine.filter((i) => (saves[i.id] ?? 0) > 0).length;
    return { c, count: mine.length || c.submissions_count, views, approval: mine.length ? Math.round((saved / mine.length) * 100) : 0 };
  }).sort((a, b) => Number(b.c.reputation_score) - Number(a.c.reputation_score) || b.views - a.views), [curators, items, saves]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="font-mono text-xs uppercase tracking-widest text-signal">● Leaderboard</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Top curators</h1>
      <p className="mt-1 text-sm text-muted-foreground">People surfacing the highest-signal content on X.com.</p>
      <div className="mt-8 overflow-hidden rounded-lg border">
        <div className="grid grid-cols-[2.5rem_1fr_5rem_5rem_6rem_5rem] gap-3 border-b bg-card px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>#</span><span>Curator</span><span className="text-right">Rep</span><span className="text-right">Subs</span><span className="text-right">Views gen.</span><span className="text-right">Save rate</span>
        </div>
        {isLoading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 animate-pulse border-b bg-background last:border-0" />)
          : rows.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No curators yet. <Link to="/submit" className="text-signal hover:underline">Submit the first link</Link> and claim #1.
            </div>
          ) : rows.map(({ c, count, views, approval }, n) => (
            <div key={c.id} className="grid h-12 grid-cols-[2.5rem_1fr_5rem_5rem_6rem_5rem] items-center gap-3 border-b px-4 font-mono text-xs last:border-0 hover:bg-card">
              <span className={n < 3 ? "text-signal" : "text-muted-foreground"}>{String(n + 1).padStart(2, "0")}</span>
              <span className="flex min-w-0 items-center gap-2 font-sans text-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent font-mono text-[10px] uppercase">{c.handle[0]}</span>
                <span className="truncate">{c.handle}</span>{c.is_verified_curator && <span className="text-signal">✓</span>}
              </span>
              <span className="text-right tabular-nums">{Math.round(Number(c.reputation_score))}</span>
              <span className="text-right tabular-nums text-muted-foreground">{count}</span>
              <span className="text-right tabular-nums text-muted-foreground">{fmt(views)}</span>
              <span className={`text-right tabular-nums ${approval >= 50 ? "text-signal" : approval > 0 ? "text-rising" : "text-muted-foreground"}`}>{approval}%</span>
            </div>
          ))}
      </div>
    </main>
  );
}
