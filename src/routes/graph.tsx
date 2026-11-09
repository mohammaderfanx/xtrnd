import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { itemsQuery, useSession } from "@/lib/xtrnd";
import { buildGraph, type GNode } from "@/lib/graph";

export const Route = createFileRoute("/graph")({
  head: () => ({
    meta: [
      { title: "Knowledge Graph — Xtrnd" },
      { name: "description", content: "Explore how X.com creators, communities, topics and AI-extracted concepts connect across high-signal hubs." },
      { property: "og:title", content: "Knowledge Graph — Xtrnd" },
      { property: "og:description", content: "A visual map of high-signal hubs across tech, AI and startups on X.com." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GraphPage,
});

const COLORS: Record<string, string> = { Creator: "var(--color-signal)", Community: "var(--color-hot)", Topic: "var(--color-pro)", Concept: "var(--color-foreground)" };
const W = 1000, H = 640;

function GraphPage() {
  const { session } = useSession();
  const { data: items = [] } = useQuery(itemsQuery);
  const { data: kg } = useQuery({ queryKey: ["kg", session?.user.id], enabled: !!session, queryFn: async () => ({
    nodes: (await supabase.from("kg_nodes").select("*")).data ?? [],
    edges: (await supabase.from("kg_edges").select("*")).data ?? [],
    insights: (await supabase.from("ai_item_insights").select("item_id, key_takeaways")).data ?? [],
  }) });
  const graph = useMemo(() => buildGraph(items, kg?.nodes ?? [], kg?.edges ?? [], kg?.insights ?? []), [items, kg]);
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [kinds, setKinds] = useState<Record<string, boolean>>({ Creator: true, Community: true, Topic: true, Concept: true });
  const drag = useRef<string | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Small force layout: repulsion + springs + centering, run to rest once.
    const p: Record<string, { x: number; y: number; vx: number; vy: number }> = {};
    graph.nodes.forEach((n, i) => { const a = (i / graph.nodes.length) * Math.PI * 2; p[n.id] = { x: W / 2 + Math.cos(a) * 250, y: H / 2 + Math.sin(a) * 200, vx: 0, vy: 0 }; });
    for (let it = 0; it < 300; it++) {
      const ns = graph.nodes;
      for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) {
        const a = p[ns[i]!.id]!, b = p[ns[j]!.id]!;
        const dx = a.x - b.x, dy = a.y - b.y, d2 = Math.max(dx * dx + dy * dy, 100), f = 2200 / d2;
        const d = Math.sqrt(d2); a.vx += (dx / d) * f; a.vy += (dy / d) * f; b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
      }
      for (const e of graph.edges) {
        const a = p[e.source], b = p[e.target]; if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1, f = (d - 90) * 0.02;
        a.vx += (dx / d) * f; a.vy += (dy / d) * f; b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
      }
      for (const n of ns) { const q = p[n.id]!; q.vx += (W / 2 - q.x) * 0.004; q.vy += (H / 2 - q.y) * 0.004; q.x = Math.min(W - 30, Math.max(30, q.x + q.vx * 0.5)); q.y = Math.min(H - 30, Math.max(30, q.y + q.vy * 0.5)); q.vx *= 0.6; q.vy *= 0.6; }
    }
    setPos(Object.fromEntries(Object.entries(p).map(([k, v]) => [k, { x: v.x, y: v.y }])));
  }, [graph]);

  const visible = (n: GNode | undefined) => !!n && kinds[n.kind] !== false;
  const byId = useMemo(() => Object.fromEntries(graph.nodes.map((n) => [n.id, n])), [graph]);
  const neighbors = useMemo(() => new Set(sel ? graph.edges.flatMap((e) => (e.source === sel ? [e.target] : e.target === sel ? [e.source] : [])) : []), [sel, graph]);
  const selected = sel ? byId[sel] : null;

  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !svg.current) return;
    const r = svg.current.getBoundingClientRect();
    setPos((p) => ({ ...p, [drag.current!]: { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H } }));
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <p className="font-mono text-xs uppercase tracking-widest text-pro">● Knowledge graph</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Signal hubs</h1>
      <p className="mt-2 text-sm text-muted-foreground">{graph.nodes.length} nodes · {graph.edges.length} links. Creators connect to their topics, communities and the concepts AI extracted from their posts. Drag nodes; click to focus.</p>
      <div className="mt-4 flex flex-wrap gap-2 font-mono text-xs">
        {Object.keys(COLORS).map((k) => (
          <button key={k} onClick={() => setKinds((s) => ({ ...s, [k]: !s[k] }))} className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 ${kinds[k] ? "text-foreground" : "text-muted-foreground opacity-50"}`}>
            <span className="h-2 w-2 rounded-full" style={{ background: COLORS[k] }} />{k}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_16rem]">
        <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="aspect-[25/16] w-full touch-none rounded-lg border bg-card" onPointerMove={onMove} onPointerUp={() => (drag.current = null)} onPointerLeave={() => (drag.current = null)}>
          {graph.edges.map((e, i) => {
            const a = pos[e.source], b = pos[e.target];
            if (!a || !b || !visible(byId[e.source]) || !visible(byId[e.target])) return null;
            const hi = sel && (e.source === sel || e.target === sel);
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--color-border)" strokeOpacity={sel && !hi ? 0.25 : 1} strokeWidth={hi ? 2 : 1} className={hi ? "stroke-pro" : ""} />;
          })}
          {graph.nodes.map((n) => {
            const p = pos[n.id]; if (!p || !visible(n)) return null;
            const dim = sel && sel !== n.id && !neighbors.has(n.id);
            const r = 5 + Math.min(14, n.weight * 2);
            return (
              <g key={n.id} transform={`translate(${p.x},${p.y})`} opacity={dim ? 0.25 : 1} className="cursor-pointer"
                onPointerDown={() => { drag.current = n.id; setSel(n.id); }}>
                <circle r={r} fill={COLORS[n.kind]} fillOpacity={0.85} stroke="var(--color-background)" strokeWidth={2} />
                <text y={r + 12} textAnchor="middle" fontSize={11} fill="var(--color-muted-foreground)" className="pointer-events-none select-none font-mono">{n.label.slice(0, 22)}</text>
              </g>
            );
          })}
        </svg>
        <aside className="rounded-lg border p-4 text-sm">
          {!selected ? <p className="text-muted-foreground">Select a node to see its connections.</p> : (
            <>
              <p className="font-mono text-[11px] uppercase" style={{ color: COLORS[selected.kind] }}>{selected.kind}</p>
              <h2 className="mt-1 font-semibold">{selected.label}</h2>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{neighbors.size} connections</p>
              <ul className="mt-3 space-y-1.5">{[...neighbors].map((id) => <li key={id}><button onClick={() => setSel(id)} className="text-left hover:text-pro">{byId[id]?.label}</button></li>)}</ul>
              <button onClick={() => setSel(null)} className="mt-4 text-xs text-muted-foreground hover:text-foreground">Clear focus</button>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
