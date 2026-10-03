import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { TrendCard } from "@/components/TrendCard";
import { useBookmarks } from "@/lib/bookmarks";
import { CATEGORIES, itemsQuery, type Category, type ItemType, type Metrics } from "@/lib/xtrnd";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Xtrnd — Discover the best of X.com, zero noise" },
      { name: "description", content: "Curated, high-signal discovery of top-performing X posts, threads, accounts, media and communities." },
      { property: "og:title", content: "Xtrnd — Discover the best of X.com, zero noise" },
      { property: "og:description", content: "Curated, high-signal discovery of top X content. Filter instantly by type, category and time." },
    ],
  }),
  component: Index,
});

const TABS: { label: string; value: ItemType | "All" }[] = [
  { label: "All", value: "All" }, { label: "Top Posts", value: "Post" }, { label: "Accounts", value: "Account" },
  { label: "Threads", value: "Thread" }, { label: "Communities", value: "Community" }, { label: "Media", value: "Media" },
];
const TIMES = [{ l: "24h", h: 24 }, { l: "7 Days", h: 168 }, { l: "All Time", h: 0 }];

function Index() {
  const { data = [], isLoading } = useQuery(itemsQuery);
  const { ids, toggle } = useBookmarks();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<ItemType | "All">("All");
  const [cat, setCat] = useState<Category | "">("");
  const [time, setTime] = useState(0);

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    const now = Date.now();
    return data
      .filter((i) => tab === "All" || i.type === tab)
      .filter((i) => !cat || i.category === cat)
      .filter((i) => !time || now - new Date(i.created_at).getTime() <= time * 3600e3)
      .filter((i) => !s || `${i.title_or_snippet} ${i.author_handle} ${i.author_name} ${i.category} ${i.type}`.toLowerCase().includes(s))
      .sort((a, b) => (b.metrics as unknown as Metrics).engagement_score - (a.metrics as unknown as Metrics).engagement_score);
  }, [data, q, tab, cat, time]);

  return (
    <main>
      <section className="relative border-b">
        <div className="grid-bg pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-4 py-12">
          <p className="font-mono text-xs uppercase tracking-widest text-signal">● {data.length} curated signals</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
            Xtrnd <span className="text-muted-foreground">— Discover the best of X.com, zero noise.</span>
          </h1>
        </div>
      </section>

      <div className="sticky top-14 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <label className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search snippets, @handles, tags…"
              className="h-9 w-full rounded-md border bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring" />
          </label>
          <select value={cat} onChange={(e) => setCat(e.target.value as Category | "")}
            className="h-9 rounded-md border bg-card px-3 text-sm outline-none focus:border-ring">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <div className="flex rounded-md border p-0.5 font-mono text-xs">
            {TIMES.map((t) => (
              <button key={t.l} onClick={() => setTime(t.h)}
                className={`rounded-sm px-2.5 py-1.5 ${time === t.h ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t.l}</button>
            ))}
          </div>
          <div className="flex w-full gap-1 overflow-x-auto text-sm">
            {TABS.map((t) => (
              <button key={t.label} onClick={() => setTab(t.value)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 ${tab === t.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {isLoading ? (
          <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-72 animate-pulse bg-background" />)}
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-lg border p-12 text-center text-sm text-muted-foreground">No matches. Try a different filter.</p>
        ) : (
          <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {items.map((i) => <TrendCard key={i.id} item={i} saved={ids.has(i.id)} onToggle={() => toggle(i.id)} />)}
          </div>
        )}
      </div>
    </main>
  );
}
