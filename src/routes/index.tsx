import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { Search, LayoutGrid, Rows3 } from "lucide-react";
import { TrendCard, TerminalRow } from "@/components/TrendCard";
import { useBookmarks } from "@/lib/bookmarks";
import {
  CATEGORIES, curatorsQuery, fuzzy, historyQuery, itemsQuery, metricsOf, savesQuery, velocityOf,
  type Category, type ItemType,
} from "@/lib/xtrnd";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Xtrnd — Discover the best of X.com, zero noise" },
      { name: "description", content: "Curated, high-signal discovery of top-performing X posts, threads, accounts, media and communities." },
      { property: "og:title", content: "Xtrnd — Discover the best of X.com, zero noise" },
      { property: "og:description", content: "Curated, high-signal discovery of top X content. Filter instantly by type, category and time." },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(itemsQuery);
    context.queryClient.prefetchQuery(historyQuery);
  },
  component: Index,
});

const TABS: { label: string; value: ItemType | "All" }[] = [
  { label: "All", value: "All" }, { label: "Posts", value: "Post" }, { label: "Accounts", value: "Account" },
  { label: "Threads", value: "Thread" }, { label: "Communities", value: "Community" }, { label: "Media", value: "Media" },
];
const TIMES = [{ l: "24h", h: 24 }, { l: "7 Days", h: 168 }, { l: "All Time", h: 0 }];
const SORTS = [{ l: "Trending", v: "rank" }, { l: "Score", v: "score" }] as const;

function Index() {
  const { data = [], isLoading } = useQuery(itemsQuery);
  const { data: history = [] } = useQuery(historyQuery);
  const { data: saves = {} } = useQuery(savesQuery);
  const { data: curators = [] } = useQuery(curatorsQuery);
  const { ids, toggle } = useBookmarks();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<ItemType | "All">("All");
  const [cat, setCat] = useState<Category | "">("");
  const [time, setTime] = useState(0);
  const [sort, setSort] = useState<"rank" | "score">("rank");
  const [view, setView] = useState<"grid" | "terminal">("grid");

  useEffect(() => { const v = localStorage.getItem("xtrnd-view"); if (v === "terminal") setView("terminal"); }, []);
  const setViewP = (v: "grid" | "terminal") => { setView(v); localStorage.setItem("xtrnd-view", v); };

  const curatorById = useMemo(() => Object.fromEntries(curators.map((c) => [c.id, c])), [curators]);
  const velocity = useMemo(() => Object.fromEntries(data.map((i) => [i.id, velocityOf(i, history, saves[i.id] ?? 0)])), [data, history, saves]);

  const items = useMemo(() => {
    const now = Date.now();
    return data
      .filter((i) => tab === "All" || i.type === tab)
      .filter((i) => !cat || i.category === cat)
      .filter((i) => !time || now - new Date(i.created_at).getTime() <= time * 3600e3)
      .filter((i) => !q.trim() || fuzzy(`${i.title_or_snippet} ${i.author_handle} ${i.author_name ?? ""} ${i.category} ${i.type} ${velocity[i.id] ?? ""}`, q))
      .sort((a, b) => sort === "rank" ? (b.rank_score ?? 0) - (a.rank_score ?? 0) : metricsOf(b).engagement_score - metricsOf(a).engagement_score);
  }, [data, q, tab, cat, time, sort, velocity]);

  const pill = (on: boolean) => `whitespace-nowrap rounded-md px-3 py-1.5 transition-colors ${on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`;
  const seg = (on: boolean) => `rounded-sm px-2.5 py-1.5 ${on ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`;
  const viral = data.filter((i) => velocity[i.id] === "Viral").length;

  return (
    <main>
      <section className="relative border-b">
        <div className="grid-bg pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-4 py-10">
          <p className="font-mono text-xs uppercase tracking-widest text-signal">
            ● {data.length} curated signals <span className="text-hot">· {viral} viral now</span>
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
            Xtrnd <span className="text-muted-foreground">— Discover the best of X.com, zero noise.</span>
          </h1>
          <p className="mt-3 font-mono text-xs text-muted-foreground">Press <kbd className="rounded border px-1">⌘K</kbd> to search · <kbd className="rounded border px-1">⇧S</kbd> submit · <kbd className="rounded border px-1">⇧B</kbd> saved</p>
        </div>
      </section>

      <div className="sticky top-14 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <label className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Fuzzy search snippets, @handles, tags…"
              className="h-9 w-full rounded-md border bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring" />
          </label>
          <div className="flex rounded-md border p-0.5 font-mono text-xs">
            {TIMES.map((t) => <button key={t.l} onClick={() => setTime(t.h)} className={seg(time === t.h)}>{t.l}</button>)}
          </div>
          <div className="flex rounded-md border p-0.5 font-mono text-xs">
            {SORTS.map((s) => <button key={s.v} onClick={() => setSort(s.v)} className={seg(sort === s.v)}>{s.l}</button>)}
          </div>
          <div className="flex rounded-md border p-0.5">
            <button aria-label="Grid view" onClick={() => setViewP("grid")} className={seg(view === "grid")}><LayoutGrid className="h-4 w-4" /></button>
            <button aria-label="Terminal view" onClick={() => setViewP("terminal")} className={seg(view === "terminal")}><Rows3 className="h-4 w-4" /></button>
          </div>
          <div className="flex w-full gap-1 overflow-x-auto text-sm">
            {TABS.map((t) => <button key={t.label} onClick={() => setTab(t.value)} className={pill(tab === t.value)}>{t.label}</button>)}
            <span className="mx-2 w-px shrink-0 bg-border" />
            <button onClick={() => setCat("")} className={pill(!cat)}>All topics</button>
            {CATEGORIES.map((c) => <button key={c} onClick={() => setCat(cat === c ? "" : c)} className={pill(cat === c)}>{c}</button>)}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {isLoading ? (
          <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex h-[300px] flex-col gap-4 bg-background p-5">
                <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                <div className="flex gap-3"><div className="h-9 w-9 animate-pulse rounded-full bg-muted" /><div className="h-9 flex-1 animate-pulse rounded bg-muted" /></div>
                <div className="flex-1 animate-pulse rounded bg-muted" />
                <div className="h-9 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-lg border p-12 text-center text-sm text-muted-foreground">No matches. Try a different filter.</p>
        ) : view === "grid" ? (
          <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {items.map((i) => <TrendCard key={i.id} item={i} saved={ids.has(i.id)} onToggle={() => toggle(i.id)}
              velocity={velocity[i.id]} curator={i.submitted_by ? curatorById[i.submitted_by] : undefined} />)}
            {Array.from({ length: (3 - (items.length % 3)) % 3 }).map((_, k) => <div key={k} className="hidden bg-background lg:block" />)}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <div className="hidden grid-cols-[2rem_9rem_1fr_6.5rem_4.5rem_4.5rem_4.5rem_3.5rem_auto] gap-3 border-b bg-card px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground md:grid">
              <span>#</span><span>Author</span><span>Signal</span><span>Velocity</span><span className="text-right">Views</span>
              <span className="text-right">Likes</span><span className="text-right">RTs</span><span className="text-right">Score</span><span className="w-4" />
            </div>
            {items.map((i, n) => <TerminalRow key={i.id} rank={n + 1} item={i} saved={ids.has(i.id)} onToggle={() => toggle(i.id)}
              velocity={velocity[i.id]} curator={i.submitted_by ? curatorById[i.submitted_by] : undefined} />)}
          </div>
        )}
      </div>
    </main>
  );
}
