import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Bot, Loader2, Play, Trash2, FlaskConical, Activity } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { itemsQuery, useSession } from "@/lib/xtrnd";
import { testAgent, runAgentNow } from "@/lib/intel.functions";
import { MAX_AGENTS, RUN_INTERVALS, type AgentCriteria } from "@/lib/intel-rules";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Agent Control Center — Xtrnd" },
      { name: "description", content: "Build autonomous AI curator agents that scan X.com signals and curate matches every 15 minutes." },
      { property: "og:title", content: "Agent Control Center — Xtrnd" },
      { property: "og:description", content: "Autonomous AI agents that curate high-signal X.com content for you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Agents,
});

const PERSONAS = [
  { name: "Landing Page Critic", prompt: "Find viral SaaS landing page critiques and conversion teardowns.", kw: "landing, conversion, saas" },
  { name: "Funding Radar", prompt: "Track startup fundraising announcements and investor commentary.", kw: "raised, seed, series" },
  { name: "Design Systems Watch", prompt: "Surface practical design system and UX craft threads.", kw: "design, ux, figma" },
];

type Draft = { name: string; prompt: string; kw: string; semantic: string; interval: string };
const empty: Draft = { name: "", prompt: "", kw: "", semantic: "", interval: "15m" };
const toCriteria = (d: Draft): AgentCriteria => ({ keywords: d.kw.split(",").map((k) => k.trim()).filter(Boolean).slice(0, 12), min_followers: 0, semantic_query: d.semantic.trim(), run_interval: d.interval });

function Agents() {
  const { session, ready } = useSession();
  const qc = useQueryClient();
  const { data: items = [] } = useQuery(itemsQuery);
  const test = useServerFn(testAgent);
  const runNow = useServerFn(runAgentNow);
  const [d, setD] = useState<Draft>(empty);
  const [preview, setPreview] = useState<{ scanned: number; hits: { id: string; similarity: number }[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const { data: agents = [] } = useQuery({
    queryKey: ["agents", session?.user.id], enabled: !!session,
    queryFn: async () => (await supabase.from("ai_agents").select("id, name, system_prompt, criteria_config, is_active, last_run_at, created_at").order("created_at")).data ?? [],
  });
  const { data: runs = [] } = useQuery({
    queryKey: ["agent-runs", session?.user.id], enabled: !!session,
    queryFn: async () => (await supabase.from("agent_runs").select("*").order("started_at", { ascending: false }).limit(200)).data ?? [],
  });
  const { data: hits = [] } = useQuery({
    queryKey: ["agent-hits", session?.user.id], enabled: !!session,
    queryFn: async () => (await supabase.from("agent_hits").select("*").order("created_at", { ascending: false }).limit(300)).data ?? [],
  });
  const refresh = () => ["agents", "agent-runs", "agent-hits"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const title = (id: string) => items.find((i) => i.id === id);

  if (ready && !session) {
    return <main className="mx-auto max-w-3xl px-4 py-16 text-center"><Bot className="mx-auto h-8 w-8 text-pro" /><h1 className="mt-4 text-2xl font-semibold">Agent Control Center</h1>
      <p className="mt-2 text-sm text-muted-foreground">Sign in to build autonomous curator agents.</p><Link to="/auth" className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Sign in</Link></main>;
  }

  const doTest = async () => {
    setBusy("test");
    const r = await test({ data: { system_prompt: d.prompt, criteria: toCriteria(d) } });
    setBusy(null);
    if (!r.ok) return toast.error(r.error);
    setPreview({ scanned: r.scanned, hits: r.hits });
  };
  const save = async () => {
    if (!d.name.trim() || !(d.prompt.trim() || d.semantic.trim())) return toast.error("Give the agent a name and a persona or search intent.");
    if (agents.length >= MAX_AGENTS) return toast.error(`You can have up to ${MAX_AGENTS} agents.`);
    const { error } = await supabase.from("ai_agents").insert({ user_id: session!.user.id, name: d.name.trim(), system_prompt: d.prompt.trim(), criteria_config: toCriteria(d) });
    if (error) return toast.error(error.message);
    toast.success("Agent activated — it will run on its schedule");
    setD(empty); setPreview(null); refresh();
  };
  const toggle = async (id: string, on: boolean) => { await supabase.from("ai_agents").update({ is_active: on }).eq("id", id); refresh(); };
  const remove = async (id: string) => { await supabase.from("ai_agents").delete().eq("id", id); refresh(); };
  const run = async (id: string) => {
    setBusy(id);
    const r = await runNow({ data: { agentId: id } });
    setBusy(null);
    if (!r.ok) toast.error(r.error); else toast.success(`Scanned ${r.scanned}, curated ${r.hits}`);
    refresh();
  };
  const input = "h-9 w-full rounded-md border bg-card px-3 text-sm outline-none focus:border-ring";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <p className="font-mono text-xs uppercase tracking-widest text-pro">● Autonomous curation</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Agent Control Center</h1>
      <p className="mt-2 text-sm text-muted-foreground">Agents scan new X signals on a schedule (every 15 minutes at most), rank them by meaning and keywords, and curate matches automatically.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-lg border p-5">
          <h2 className="font-semibold">Build an agent</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {PERSONAS.map((p) => <button key={p.name} onClick={() => setD({ ...d, name: p.name, prompt: p.prompt, kw: p.kw, semantic: p.prompt })}
              className="rounded-md border px-2.5 py-1 text-xs text-muted-foreground hover:border-pro/60 hover:text-pro">{p.name}</button>)}
          </div>
          <div className="mt-4 space-y-3">
            <input className={input} placeholder="Agent name, e.g. SaaS Competitor Watcher" value={d.name} maxLength={80} onChange={(e) => setD({ ...d, name: e.target.value })} />
            <textarea className={`${input} h-20 py-2`} placeholder="Persona prompt: Find viral SaaS landing page critiques" value={d.prompt} maxLength={2000} onChange={(e) => setD({ ...d, prompt: e.target.value })} />
            <input className={input} placeholder="Semantic intent (optional — defaults to the persona)" value={d.semantic} maxLength={300} onChange={(e) => setD({ ...d, semantic: e.target.value })} />
            <input className={input} placeholder="Boost keywords, comma separated" value={d.kw} onChange={(e) => setD({ ...d, kw: e.target.value })} />
            <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Runs every</span>
              <div className="flex rounded-md border p-0.5 font-mono text-xs">{RUN_INTERVALS.map((r) => <button key={r} onClick={() => setD({ ...d, interval: r })} className={`rounded-sm px-2.5 py-1 ${d.interval === r ? "bg-accent text-foreground" : "text-muted-foreground"}`}>{r}</button>)}</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={doTest} disabled={busy === "test"}>{busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}Live test</Button>
              <Button onClick={save}>Activate agent</Button>
            </div>
          </div>
        </section>
        <section className="rounded-lg border p-5">
          <h2 className="font-semibold">Live test preview</h2>
          {!preview ? <p className="mt-3 text-sm text-muted-foreground">Run a live test to see what this agent would curate right now — nothing is saved.</p> : (
            <>
              <p className="mt-2 font-mono text-xs text-muted-foreground">Scanned {preview.scanned} · would curate {preview.hits.length}</p>
              <ul className="mt-3 divide-y rounded-md border">
                {preview.hits.length ? preview.hits.map((h) => { const i = title(h.id); return (
                  <li key={h.id} className="flex gap-3 p-3 text-sm"><span className="font-mono text-xs text-pro">{Math.round(h.similarity * 100)}%</span>
                    <span className="min-w-0"><span className="font-mono text-xs text-muted-foreground">{i?.author_handle}</span><span className="line-clamp-2">{i?.title_or_snippet}</span></span></li>); })
                  : <li className="p-3 text-sm text-muted-foreground">No strong matches. Broaden the intent or keywords.</li>}
              </ul>
            </>
          )}
        </section>
      </div>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 font-semibold"><Activity className="h-4 w-4 text-signal" />Agent health</h2>
        <div className="mt-3 overflow-hidden rounded-lg border">
          {!agents.length ? <p className="p-6 text-sm text-muted-foreground">No agents yet.</p> : agents.map((a) => {
            const c = a.criteria_config as unknown as AgentCriteria;
            const r = runs.filter((x) => x.agent_id === a.id);
            const ok = r.filter((x) => x.status === "ok");
            const prec = ok.filter((x) => x.precision != null);
            const avg = prec.length ? prec.reduce((s, x) => s + (x.precision ?? 0), 0) / prec.length : null;
            const h = hits.filter((x) => x.agent_id === a.id);
            return (
              <details key={a.id} className="border-b last:border-b-0">
                <summary className="grid cursor-pointer grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 hover:bg-card md:grid-cols-[1fr_5rem_5rem_6rem_7rem_auto]">
                  <span className="min-w-0"><span className="flex items-center gap-2 font-medium"><span className={`h-2 w-2 rounded-full ${a.is_active ? "bg-signal" : "bg-muted-foreground"}`} />{a.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{a.system_prompt}</span></span>
                  <span className="hidden font-mono text-xs md:block">{h.length} hits</span>
                  <span className="hidden font-mono text-xs md:block">{r.length} runs</span>
                  <span className="hidden font-mono text-xs text-pro md:block">{avg == null ? "—" : `${Math.round(avg * 100)}% prec.`}</span>
                  <span className="hidden font-mono text-[11px] text-muted-foreground md:block">{a.last_run_at ? new Date(a.last_run_at).toLocaleTimeString() : "never"} · {c.run_interval}</span>
                  <span className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
                    <button onClick={() => run(a.id)} aria-label="Run now" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">{busy === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}</button>
                    <button onClick={() => toggle(a.id, !a.is_active)} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent">{a.is_active ? "Pause" : "Resume"}</button>
                    <button onClick={() => remove(a.id)} aria-label="Delete agent" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </span>
                </summary>
                <div className="grid gap-4 bg-card/50 px-4 py-3 md:grid-cols-2">
                  <div><h3 className="font-mono text-[11px] uppercase text-muted-foreground">Curated signals</h3>
                    <ul className="mt-2 space-y-1.5 text-sm">{h.slice(0, 8).map((x) => <li key={x.item_id} className="line-clamp-1"><span className="mr-2 font-mono text-xs text-pro">{Math.round(x.similarity * 100)}%</span>{title(x.item_id)?.title_or_snippet}</li>)}
                      {!h.length && <li className="text-muted-foreground">Nothing curated yet.</li>}</ul></div>
                  <div><h3 className="font-mono text-[11px] uppercase text-muted-foreground">Execution log</h3>
                    <ul className="mt-2 space-y-1 font-mono text-xs">{r.slice(0, 8).map((x) => <li key={x.id} className={x.status === "ok" ? "text-muted-foreground" : "text-destructive"}>{new Date(x.started_at).toLocaleString()} · {x.log}</li>)}
                      {!r.length && <li className="text-muted-foreground">No runs yet — first scheduled run within 15 minutes.</li>}</ul></div>
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </main>
  );
}
