import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Plus, Trash2, Send, Radio } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { matchesRules, testWebhook } from "@/lib/pro.functions";
import { usePlan } from "@/lib/plan";
import { CATEGORIES, TYPES, itemsQuery, type Category, type ItemType } from "@/lib/xtrnd";
import { ProBadge, ProGate } from "@/components/ProBadge";

export const Route = createFileRoute("/feeds")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Signal Feeds — Xtrnd Pro" },
      { name: "description", content: "Build custom X.com signal feeds with keyword logic and score thresholds, delivered to Discord or Slack." },
      { property: "og:title", content: "Signal Feeds — Xtrnd Pro" },
      { property: "og:description", content: "Custom keyword and threshold feeds for X.com, pushed to Discord or Slack." },
    ],
  }),
  component: Feeds,
});

type Rules = { keywords: string[]; exclude: string[]; match: "any" | "all"; min_engagement: number; categories: Category[]; handles: string[]; types: ItemType[] };
const EMPTY: Rules = { keywords: [], exclude: [], match: "any", min_engagement: 0, categories: [], handles: [], types: [] };

const TEMPLATES: { name: string; rules: Rules }[] = [
  { name: "AI LLM Research", rules: { ...EMPTY, keywords: ["agent", "model", "eval", "llm"], categories: ["AI & Tech"], min_engagement: 80 } },
  { name: "Bootstrapped SaaS wins", rules: { ...EMPTY, keywords: ["arr", "mrr", "bootstrapped"], categories: ["SaaS & Startups"] } },
  { name: "Crypto threads only", rules: { ...EMPTY, categories: ["Crypto"], types: ["Thread"], min_engagement: 85 } },
];

const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

function Feeds() {
  const { session, isPro, ready } = usePlan();
  const qc = useQueryClient();
  const { data: items = [] } = useQuery(itemsQuery);
  const { data: feeds = [] } = useQuery({
    queryKey: ["feeds", session?.user.id], enabled: !!session,
    queryFn: async () => (await supabase.from("custom_signal_feeds").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const test = useServerFn(testWebhook);
  const [name, setName] = useState("");
  const [rules, setRules] = useState<Rules>(EMPTY);
  const [kw, setKw] = useState(""); const [ex, setEx] = useState(""); const [hd, setHd] = useState("");
  const [hook, setHook] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const draft: Rules = { ...rules, keywords: list(kw), exclude: list(ex), handles: list(hd) };
  const preview = useMemo(() => items.filter((i) => matchesRules(i, draft)), [items, kw, ex, hd, rules]);
  const active = feeds.find((f) => f.id === activeId);
  const activeHits = active ? items.filter((i) => matchesRules(i, active.filter_rules as Rules)) : [];

  const loadTemplate = (t: (typeof TEMPLATES)[number]) => {
    setName(t.name); setRules(t.rules); setKw(t.rules.keywords.join(", ")); setEx(""); setHd("");
  };

  const save = async () => {
    if (!session) { toast.error("Sign in to save a feed"); return; }
    if (!name.trim()) { toast.error("Name your feed"); return; }
    if (hook && !/^https:\/\/(discord(app)?\.com\/api\/webhooks|hooks\.slack\.com)\//.test(hook)) { toast.error("Use a Discord or Slack webhook link"); return; }
    const { error } = await supabase.from("custom_signal_feeds").insert({ user_id: session.user.id, name: name.trim(), filter_rules: draft, webhook_url: hook || null });
    if (error) { toast.error(error.message.includes("row-level") ? "Signal Feeds require Pro." : error.message); return; }
    toast.success("Feed saved"); setName(""); setKw(""); setEx(""); setHd(""); setHook(""); setRules(EMPTY);
    qc.invalidateQueries({ queryKey: ["feeds"] });
  };

  const remove = async (id: string) => {
    await supabase.from("custom_signal_feeds").delete().eq("id", id);
    if (activeId === id) setActiveId(null);
    qc.invalidateQueries({ queryKey: ["feeds"] });
  };

  const toggle = <K extends "categories" | "types">(k: K, v: Rules[K][number]) =>
    setRules((r) => ({ ...r, [k]: (r[k] as string[]).includes(v) ? (r[k] as string[]).filter((x) => x !== v) : [...r[k], v] }));

  const field = "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-ring";
  const chip = (on: boolean) => `rounded-md border px-2.5 py-1 text-xs ${on ? "border-pro/50 bg-pro/15 text-foreground" : "text-muted-foreground hover:text-foreground"}`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center gap-2"><h1 className="text-3xl font-semibold tracking-tight">Signal Feeds</h1><ProBadge /></div>
      <p className="mt-1 text-sm text-muted-foreground">Keyword logic + score thresholds. Matches get pushed to Discord or Slack the moment they're published.</p>

      {ready && !session ? (
        <p className="mt-8 rounded-lg border p-10 text-center text-sm text-muted-foreground"><Link to="/auth" className="text-pro hover:underline">Sign in</Link> to build feeds.</p>
      ) : !isPro ? (
        <div className="mt-8 space-y-6">
          <ProGate title="Custom Signal Feeds are a Pro feature" body="Track exactly the topics, accounts and score thresholds you care about, with instant Discord/Slack alerts." />
          <div className="grid gap-3 md:grid-cols-3">
            {TEMPLATES.map((t) => (
              <div key={t.name} className="rounded-lg border p-4 opacity-80">
                <div className="text-sm font-medium">{t.name}</div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">{items.filter((i) => matchesRules(i, t.rules)).length} matches right now</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <section className="space-y-4 rounded-lg border bg-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Templates</span>
              {TEMPLATES.map((t) => <button key={t.name} onClick={() => loadTemplate(t)} className={chip(false)}>{t.name}</button>)}
            </div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Feed name, e.g. AI LLM Research Papers" className={field} />
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="Keywords (comma separated)" className={field} />
              <div className="flex rounded-md border p-0.5 font-mono text-xs">
                {(["any", "all"] as const).map((m) => (
                  <button key={m} onClick={() => setRules((r) => ({ ...r, match: m }))} className={`rounded-sm px-2.5 ${rules.match === m ? "bg-accent text-foreground" : "text-muted-foreground"}`}>{m === "any" ? "OR" : "AND"}</button>
                ))}
              </div>
            </div>
            <input value={ex} onChange={(e) => setEx(e.target.value)} placeholder="Exclude words (NOT)" className={field} />
            <input value={hd} onChange={(e) => setHd(e.target.value)} placeholder="Only these @handles (optional)" className={field} />
            <div className="flex flex-wrap gap-1.5">{CATEGORIES.map((c) => <button key={c} onClick={() => toggle("categories", c)} className={chip(rules.categories.includes(c))}>{c}</button>)}</div>
            <div className="flex flex-wrap gap-1.5">{TYPES.map((t) => <button key={t} onClick={() => toggle("types", t)} className={chip(rules.types.includes(t))}>{t}</button>)}</div>
            <label className="block space-y-1">
              <span className="flex justify-between font-mono text-xs text-muted-foreground"><span>Min engagement score</span><span className="text-foreground">{rules.min_engagement}</span></span>
              <input type="range" min={0} max={100} value={rules.min_engagement} onChange={(e) => setRules((r) => ({ ...r, min_engagement: +e.target.value }))} className="w-full accent-[var(--pro)]" />
            </label>
            <input value={hook} onChange={(e) => setHook(e.target.value)} placeholder="Discord or Slack webhook URL (optional)" className={field} />
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">{preview.length} matches now</span>
              <button onClick={save} className="flex items-center gap-1.5 rounded-md bg-pro px-3 py-2 text-sm font-semibold text-pro-foreground"><Plus className="h-4 w-4" />Save feed</button>
            </div>
          </section>

          <section className="space-y-3">
            {feeds.length === 0 && <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">No feeds yet. Start from a template.</p>}
            {feeds.map((f) => {
              const r = f.filter_rules as Rules;
              const hits = items.filter((i) => matchesRules(i, r)).length;
              return (
                <div key={f.id} className={`rounded-lg border p-4 ${activeId === f.id ? "border-pro/50" : ""}`}>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setActiveId(activeId === f.id ? null : f.id)} className="text-left text-sm font-medium hover:text-pro">{f.name}</button>
                    {f.webhook_url && <Radio className="h-3.5 w-3.5 text-signal" />}
                    <span className="ml-auto font-mono text-xs text-muted-foreground">{hits} hits</span>
                    {f.webhook_url && (
                      <button aria-label="Send test" title="Send test to webhook" onClick={async () => { const x = await test({ data: { feedId: f.id } }); x.ok ? toast.success("Test sent") : toast.error(x.error); }} className="text-muted-foreground hover:text-foreground"><Send className="h-4 w-4" /></button>
                    )}
                    <button aria-label="Delete feed" onClick={() => remove(f.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {[r.keywords?.length && `${r.match === "all" ? "ALL" : "ANY"}(${r.keywords.join(", ")})`, r.exclude?.length && `NOT(${r.exclude.join(", ")})`,
                      r.categories?.length && r.categories.join("/"), r.types?.length && r.types.join("/"), r.min_engagement && `score ≥ ${r.min_engagement}`].filter(Boolean).join(" · ") || "Everything"}
                  </div>
                  {activeId === f.id && (
                    <ul className="mt-3 space-y-1.5 border-t pt-3">
                      {activeHits.map((i) => (
                        <li key={i.id}><a href={i.external_url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm text-foreground/90 hover:text-foreground">
                          <span className="font-mono text-xs text-muted-foreground">{i.author_handle}</span> {i.title_or_snippet}</a></li>
                      ))}
                      {activeHits.length === 0 && <li className="text-xs text-muted-foreground">No matches yet.</li>}
                    </ul>
                  )}
                </div>
              );
            })}
          </section>
        </div>
      )}
    </main>
  );
}
