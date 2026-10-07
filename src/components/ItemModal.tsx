import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight, ChevronDown, Copy, FileText, Loader2, Sparkles, Lock } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { summarizeItem } from "@/lib/pro.functions";
import { FREE_AI_PER_DAY, insightQuery, itemHistoryQuery, usePlan } from "@/lib/plan";
import { fmt, metricsOf, type Item, type Velocity } from "@/lib/xtrnd";
import { Avatar, ScoreBadge, VelocityBadge } from "./ItemBits";
import type { Database } from "@/integrations/supabase/types";

type InsightRow = Database["public"]["Tables"]["ai_item_insights"]["Row"];

export function insightMarkdown(item: Item, ins?: InsightRow | null) {
  const lines = [`### ${item.author_name ?? item.author_handle} (${item.author_handle})`, "", `> ${item.title_or_snippet.replace(/\n/g, "\n> ")}`, ""];
  if (ins) {
    lines.push("**Key takeaways**", ...(ins.key_takeaways as string[]).map((t) => `- ${t}`), "");
    if ((ins.actionable_quotes as string[]).length) lines.push("**Quotes**", ...(ins.actionable_quotes as string[]).map((q) => `- "${q}"`), "");
  }
  lines.push(`[View on X](${item.external_url}) · via Xtrnd`);
  return lines.join("\n");
}

function sentimentLabel(s: number) {
  return s > 0.25 ? { t: "Positive", c: "text-signal" } : s < -0.25 ? { t: "Negative", c: "text-destructive" } : { t: "Neutral", c: "text-muted-foreground" };
}

export function AiPanel({ item, defaultOpen = true }: { item: Item; defaultOpen?: boolean }) {
  const qc = useQueryClient();
  const { session, isPro, aiUsed } = usePlan();
  const { data: insight, isLoading } = useQuery(insightQuery(item.id));
  const run = useServerFn(summarizeItem);
  const [busy, setBusy] = useState(false);
  const [paywall, setPaywall] = useState(false);

  const generate = async () => {
    setBusy(true);
    try {
      const r = await run({ data: { itemId: item.id } });
      if (r.ok) { qc.setQueryData(["insight", item.id], r.insight); qc.invalidateQueries({ queryKey: ["plan"] }); }
      else { if ("paywall" in r && r.paywall) setPaywall(true); toast.error(r.error); }
    } catch { toast.error("AI synthesis failed. Try again shortly."); }
    finally { setBusy(false); }
  };

  return (
    <Collapsible defaultOpen={defaultOpen} className="rounded-lg border border-pro/30 bg-pro/5">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-4 py-3 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-pro" /> ⚡ AI Synthesis
        {insight && <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">cached</span>}
        <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">
        {isLoading ? <div className="h-24 animate-pulse rounded bg-muted" /> : insight ? (
          <div className="space-y-4 text-sm">
            <ul className="space-y-2">
              {(insight.key_takeaways as string[]).map((t, i) => (
                <li key={i} className="flex gap-2"><span className="font-mono text-pro">{i + 1}.</span><span>{t}</span></li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-muted-foreground">
              <span>Sentiment <span className={sentimentLabel(Number(insight.sentiment_score)).c}>{sentimentLabel(Number(insight.sentiment_score)).t} ({Number(insight.sentiment_score).toFixed(2)})</span></span>
              {insight.target_audience && <span>For <span className="text-foreground">{insight.target_audience}</span></span>}
            </div>
            {(insight.actionable_quotes as string[]).length > 0 && (
              <div className="space-y-1.5">
                {(insight.actionable_quotes as string[]).map((q, i) => (
                  <blockquote key={i} className="border-l-2 border-pro/50 pl-3 text-foreground/80 italic">“{q}”</blockquote>
                ))}
              </div>
            )}
          </div>
        ) : !session ? (
          <p className="text-sm text-muted-foreground"><Link to="/auth" className="text-pro hover:underline">Sign in</Link> to generate an AI summary. Free accounts get {FREE_AI_PER_DAY} a day.</p>
        ) : paywall ? (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground"><Lock className="h-4 w-4" />Daily free limit reached.</span>
            <Link to="/pricing" className="rounded-md bg-pro px-3 py-1.5 text-xs font-semibold text-pro-foreground">Go Pro — unlimited</Link>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-xs text-muted-foreground">
              {isPro ? "Unlimited on Pro" : `${Math.max(0, FREE_AI_PER_DAY - aiUsed)} of ${FREE_AI_PER_DAY} free today`}
            </span>
            <button onClick={generate} disabled={busy} className="flex items-center gap-1.5 rounded-md bg-pro px-3 py-1.5 text-xs font-semibold text-pro-foreground disabled:opacity-60">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}{busy ? "Extracting signal…" : "Generate synthesis"}
            </button>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function VelocityChart({ itemId }: { itemId: string }) {
  const { data = [], isLoading } = useQuery(itemHistoryQuery(itemId));
  const rows = data.map((d) => ({
    t: new Date(d.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    views: Number(d.views_count), likes: Number(d.likes_count),
  }));
  return (
    <div className="h-44 rounded-lg border p-3">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Engagement velocity</div>
      {isLoading ? <div className="h-36 animate-pulse rounded bg-muted" /> : rows.length < 2 ? (
        <div className="grid h-36 place-items-center font-mono text-xs text-muted-foreground">Not enough snapshots yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={136}>
          <AreaChart data={rows} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--signal)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--signal)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="t" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => fmt(v)} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} formatter={(v: number) => fmt(v)} />
            <Area type="monotone" dataKey="views" stroke="var(--signal)" fill="url(#gv)" strokeWidth={2} />
            <Area type="monotone" dataKey="likes" stroke="var(--rising)" fill="transparent" strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function ItemModal({ item, velocity, onClose }: { item: Item | null; velocity?: Velocity | undefined; onClose: () => void }) {
  const { data: insight } = useQuery({ ...insightQuery(item?.id ?? "none"), enabled: !!item });
  if (!item) return null;
  const m = metricsOf(item);
  const md = insightMarkdown(item, insight);
  const copy = async (text: string, msg: string) => { await navigator.clipboard.writeText(text); toast.success(msg); };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border bg-background p-0">
        <div className="space-y-5 p-6">
          <div className="flex items-center gap-3">
            <Avatar src={item.author_avatar} size={44} />
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base">{item.author_name ?? item.author_handle}</DialogTitle>
              <DialogDescription className="font-mono text-xs">{item.author_handle} · {item.type} · {item.category}</DialogDescription>
            </div>
            <VelocityBadge v={velocity} />
          </div>
          <article className="whitespace-pre-line font-serif text-lg leading-relaxed text-foreground">{item.title_or_snippet}</article>
          <div className="flex gap-5 font-mono text-xs text-muted-foreground">
            <span>{fmt(m.views)} views</span><span>{fmt(m.likes)} likes</span><span>{fmt(m.retweets)} RTs</span>
            <span className="ml-auto"><ScoreBadge score={m.engagement_score} /></span>
          </div>
          <AiPanel item={item} />
          <VelocityChart itemId={item.id} />
          <div className="flex flex-wrap gap-2">
            <a href={item.external_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
              View on X.com <ArrowUpRight className="h-4 w-4" />
            </a>
            <button onClick={() => copy(md, "Copied as Markdown")} className="flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-accent"><Copy className="h-4 w-4" />Copy as Markdown</button>
            <button onClick={() => copy(md, "Copied — paste into any Notion page")} className="flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-accent"><FileText className="h-4 w-4" />Copy for Notion</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
