// Browser-safe knowledge graph builder: creators, communities, topics and AI-extracted concepts.
export type GNode = { id: string; label: string; kind: "Creator" | "Community" | "Topic" | "Concept"; weight: number };
export type GEdge = { source: string; target: string; relation: string };

type ItemLite = { id: string; author_handle: string; author_name: string | null; category: string; type: string; title_or_snippet: string };
const STOP = new Set("the a an and or for with from that this into your you our are was were will have has how why what when who its it's about over more most than then them they their there just like can not but all any new one two use using via".split(" "));

/** Concepts = capitalized multi-letter terms and known tech phrases appearing in AI takeaways or text. */
export function extractConcepts(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/\b([A-Z][a-zA-Z0-9]+(?:\s[A-Z][a-zA-Z0-9]+)?|[A-Z]{2,6})\b/g)) {
    const w = m[1]!.trim();
    if (w.length > 2 && !STOP.has(w.toLowerCase())) out.add(w);
  }
  return [...out].slice(0, 6);
}

export function buildGraph(
  items: ItemLite[],
  seedNodes: { id: string; label: string; kind: string }[],
  seedEdges: { source: string; target: string; relation: string }[],
  insights: { item_id: string; key_takeaways: unknown }[],
) {
  const nodes = new Map<string, GNode>();
  const edges = new Map<string, GEdge>();
  const node = (id: string, label: string, kind: GNode["kind"]) => {
    const n = nodes.get(id) ?? { id, label, kind, weight: 0 };
    n.weight++; nodes.set(id, n); return id;
  };
  const edge = (source: string, target: string, relation: string) => { if (source !== target) edges.set(`${source}|${target}|${relation}`, { source, target, relation }); };
  for (const s of seedNodes) node(s.id, s.label, (["Creator", "Community", "Topic", "Concept"].includes(s.kind) ? s.kind : "Concept") as GNode["kind"]);
  for (const e of seedEdges) edge(e.source, e.target, e.relation);
  const conceptCount = new Map<string, number>();
  const perItem = new Map<string, string[]>();
  for (const i of items) {
    const ins = insights.find((x) => x.item_id === i.id);
    const text = `${i.title_or_snippet} ${Array.isArray(ins?.key_takeaways) ? (ins!.key_takeaways as string[]).join(" ") : ""}`;
    const cs = extractConcepts(text);
    perItem.set(i.id, cs);
    cs.forEach((c) => conceptCount.set(c.toLowerCase(), (conceptCount.get(c.toLowerCase()) ?? 0) + 1));
  }
  for (const i of items) {
    const a = node(i.type === "Community" ? `community:${i.author_handle}` : `creator:${i.author_handle.toLowerCase()}`, i.author_name ?? i.author_handle, i.type === "Community" ? "Community" : "Creator");
    const t = node(`topic:${i.category}`, i.category, "Topic");
    edge(a, t, "posts-in");
    for (const c of perItem.get(i.id) ?? []) {
      // keep concepts that recur, or seeded ones, to avoid a hairball
      const seedId = [...nodes.values()].find((n) => n.kind === "Concept" && n.label.toLowerCase() === c.toLowerCase())?.id;
      if (!seedId && (conceptCount.get(c.toLowerCase()) ?? 0) < 2) continue;
      edge(a, seedId ?? node(`concept:${c.toLowerCase()}`, c, "Concept"), "mentions");
    }
  }
  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}
