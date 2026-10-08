import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Check, Copy, Code2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fmt, itemsQuery, metricsOf, type Item } from "@/lib/xtrnd";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/digest")({
  head: () => ({
    meta: [
      { title: "Signal Digest — Xtrnd" },
      { name: "description", content: "Turn 5–10 top X.com items into a ready-to-send newsletter draft in Markdown or HTML." },
      { property: "og:title", content: "Signal Digest — Xtrnd" },
      { property: "og:description", content: "Build a newsletter from the best of X.com in seconds." },
    ],
  }),
  component: Digest,
});

type Ins = Database["public"]["Tables"]["ai_item_insights"]["Row"];
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function buildMarkdown(title: string, intro: string, items: Item[], ins: Record<string, Ins>) {
  const out = [`# ${title}`, "", intro, ""];
  items.forEach((i, n) => {
    const m = metricsOf(i), x = ins[i.id];
    out.push(`## ${n + 1}. ${i.author_name ?? i.author_handle} — ${i.category}`, "", `> ${i.title_or_snippet.replace(/\n/g, "\n> ")}`, "");
    if (x) out.push(...(x.key_takeaways as string[]).map((t) => `- ${t}`), "");
    out.push(`${fmt(m.views)} views · ${fmt(m.likes)} likes · [Read on X](${i.external_url})`, "");
  });
  out.push("---", "_Curated with Xtrnd — the best of X.com, zero noise._");
  return out.join("\n");
}

function buildHtml(title: string, intro: string, items: Item[], ins: Record<string, Ins>) {
  const blocks = items.map((i, n) => {
    const m = metricsOf(i), x = ins[i.id];
    const tk = x ? `<ul style="margin:12px 0;padding-left:18px;color:#333">${(x.key_takeaways as string[]).map((t) => `<li style="margin:4px 0">${esc(t)}</li>`).join("")}</ul>` : "";
    return `<tr><td style="padding:24px 0;border-top:1px solid #eee">
<p style="margin:0;font:600 12px monospace;letter-spacing:.08em;color:#888;text-transform:uppercase">${n + 1} · ${esc(i.category)} · ${esc(i.author_handle)}</p>
<blockquote style="margin:10px 0;padding-left:14px;border-left:3px solid #10b981;font:17px/1.55 Georgia,serif;color:#111">${esc(i.title_or_snippet)}</blockquote>${tk}
<p style="margin:0;font:13px sans-serif;color:#666">${fmt(m.views)} views · ${fmt(m.likes)} likes · <a href="${esc(i.external_url)}" style="color:#10b981">Read on X →</a></p></td></tr>`;
  }).join("\n");
  return `<!doctype html><html><body style="margin:0;background:#f6f6f6"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;padding:32px">
<tr><td><h1 style="margin:0;font:700 28px sans-serif;color:#111">${esc(title)}</h1><p style="font:15px/1.6 sans-serif;color:#444">${esc(intro)}</p></td></tr>
${blocks}
<tr><td style="padding-top:24px;border-top:1px solid #eee;font:12px sans-serif;color:#999">Curated with Xtrnd — the best of X.com, zero noise.</td></tr>
</table></td></tr></table></body></html>`;
}

function Digest() {
  const { data: items = [] } = useQuery(itemsQuery);
  const { data: insights = {} } = useQuery({
    queryKey: ["insights-all"],
    queryFn: async () => Object.fromEntries(((await supabase.from("ai_item_insights").select("*")).data ?? []).map((r) => [r.item_id, r])) as Record<string, Ins>,
  });
  const sorted = useMemo(() => [...items].sort((a, b) => (b.rank_score ?? 0) - (a.rank_score ?? 0)), [items]);
  const [picked, setPicked] = useState<string[]>([]);
  const [title, setTitle] = useState(`Xtrnd Signal Digest — ${new Date().toLocaleDateString(undefined, { month: "long", day: "numeric" })}`);
  const [intro, setIntro] = useState("The highest-signal posts, threads and accounts from X this week, de-noised.");
  const [mode, setMode] = useState<"md" | "html">("md");

  const chosen = picked.map((id) => items.find((i) => i.id === id)).filter(Boolean) as Item[];
  const output = mode === "md" ? buildMarkdown(title, intro, chosen, insights) : buildHtml(title, intro, chosen, insights);
  const toggle = (id: string) => setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : p.length >= 10 ? (toast("Max 10 items"), p) : [...p, id]);
  const autopick = () => setPicked(sorted.slice(0, 5).map((i) => i.id));

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Signal Digest</h1>
      <p className="mt-1 text-sm text-muted-foreground">Pick 5–10 items. Get a newsletter draft with AI takeaways, ready to paste anywhere.</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-[22rem_1fr]">
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-muted-foreground">{picked.length}/10 selected</span>
            <button onClick={autopick} className="font-mono text-xs text-pro hover:underline">Auto-pick top 5</button>
          </div>
          <div className="max-h-[70vh] space-y-px overflow-y-auto rounded-lg border bg-border">
            {sorted.map((i) => {
              const on = picked.includes(i.id);
              return (
                <button key={i.id} onClick={() => toggle(i.id)} className={`flex w-full items-start gap-3 bg-background p-3 text-left transition-colors hover:bg-card ${on ? "bg-card" : ""}`}>
                  <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-sm border ${on ? "border-signal bg-signal text-primary-foreground" : ""}`}>{on && <Check className="h-3 w-3" />}</span>
                  <span className="min-w-0">
                    <span className="block font-mono text-[11px] text-muted-foreground">{i.author_handle} · {i.category}{insights[i.id] ? " · ⚡" : ""}</span>
                    <span className="line-clamp-2 text-sm">{i.title_or_snippet}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
        <section className="space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="h-10 w-full rounded-md border bg-card px-3 text-sm font-medium outline-none focus:border-ring" />
          <textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={2} className="w-full rounded-md border bg-card p-3 text-sm outline-none focus:border-ring" />
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border p-0.5 font-mono text-xs">
              {(["md", "html"] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={`rounded-sm px-3 py-1.5 ${mode === m ? "bg-accent text-foreground" : "text-muted-foreground"}`}>{m === "md" ? "Markdown" : "HTML email"}</button>)}
            </div>
            <button disabled={!chosen.length} onClick={async () => { await navigator.clipboard.writeText(output); toast.success("Draft copied"); }}
              className="ml-auto flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {mode === "md" ? <Copy className="h-4 w-4" /> : <Code2 className="h-4 w-4" />}Copy {mode === "md" ? "Markdown" : "HTML"}
            </button>
          </div>
          {!chosen.length ? (
            <div className="grid h-96 place-items-center rounded-lg border font-mono text-xs text-muted-foreground">Select items to generate your draft</div>
          ) : mode === "md" ? (
            <pre className="h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg border bg-card p-4 font-mono text-xs leading-relaxed">{output}</pre>
          ) : (
            <iframe title="Newsletter preview" srcDoc={output} sandbox="" className="h-[60vh] w-full rounded-lg border bg-card" />
          )}
        </section>
      </div>
    </main>
  );
}
