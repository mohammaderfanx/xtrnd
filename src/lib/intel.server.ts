// Server-only Phase 4 engines: embeddings queue, autonomous agents, daily audio brief.
import { generateEmbeddings, generateResponse, generateSpeech } from "@lovable.dev/ai-gateway";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { intervalMs, parseNaturalQuery, type AgentCriteria } from "./intel-rules";

type Admin = SupabaseClient<Database>;
export const EMBED_DIM = 1536;
export const AGENT_SIM_THRESHOLD = 0.66;

export async function embed(texts: string[]): Promise<number[][]> {
  const res = await generateEmbeddings({ model: "google/gemini-embedding-2", input: texts, dimensions: EMBED_DIM });
  return res.data.map((d) => d.embedding as number[]);
}
export const toVec = (v: number[]) => `[${v.join(",")}]`;

/** Drain a bounded batch of the embedding queue (insertion never waits for this). */
export async function processEmbeddingQueue(admin: Admin, limit = 16) {
  const { data: queue } = await admin.from("embedding_queue").select("item_id, attempts").lt("attempts", 3).order("enqueued_at").limit(limit);
  if (!queue?.length) return { embedded: 0 };
  const ids = queue.map((q) => q.item_id);
  const { data: items } = await admin.from("trending_items").select("id, title_or_snippet, author_handle, category, type").in("id", ids);
  const live = items ?? [];
  const missing = ids.filter((id) => !live.some((i) => i.id === id));
  if (missing.length) await admin.from("embedding_queue").delete().in("item_id", missing);
  if (!live.length) return { embedded: 0 };
  const chunks = live.map((i) => `${i.type} · ${i.category} · ${i.author_handle}\n${i.title_or_snippet}`.slice(0, 4000));
  try {
    const vecs = await embed(chunks);
    const rows = live.map((i, n) => ({ item_id: i.id, embedding: toVec(vecs[n]!), content_chunk: chunks[n]!, created_at: new Date().toISOString() }));
    const { error } = await admin.from("item_embeddings").upsert(rows);
    if (error) throw new Error(error.message);
    await admin.from("embedding_queue").delete().in("item_id", live.map((i) => i.id));
    return { embedded: rows.length };
  } catch (e) {
    console.error("embedding batch failed", e);
    for (const q of queue) await admin.from("embedding_queue").update({ attempts: q.attempts + 1 }).eq("item_id", q.item_id);
    return { embedded: 0, error: "Embedding failed" };
  }
}

type Candidate = { item_id: string; similarity: number; text_rank: number; score: number };

/** Score items for an agent; shared by live preview and scheduled runs. */
export async function evaluateAgent(db: Admin, criteria: AgentCriteria, queryVec: number[], sinceDays = 90) {
  const kw = (criteria.keywords ?? []).filter(Boolean);
  const { data, error } = await db.rpc("hybrid_search", {
    query_embedding: toVec(queryVec), query_text: kw.join(" or "), match_count: 30,
    since: new Date(Date.now() - sinceDays * 864e5).toISOString(),
  });
  if (error) throw new Error(error.message);
  const cands = (data ?? []) as Candidate[];
  const ids = cands.map((c) => c.item_id);
  const { data: items } = ids.length ? await db.from("trending_items").select("id, title_or_snippet, author_handle").in("id", ids) : { data: [] };
  const text = Object.fromEntries((items ?? []).map((i) => [i.id, `${i.title_or_snippet} ${i.author_handle}`.toLowerCase()]));
  const hits = cands.filter((c) => {
    const kwHit = kw.some((k) => text[c.item_id]?.includes(k.toLowerCase()));
    return c.similarity >= AGENT_SIM_THRESHOLD || (kwHit && c.similarity >= AGENT_SIM_THRESHOLD - 0.1);
  });
  return { scanned: cands.length, hits };
}

async function agentVector(admin: Admin, a: { id: string; embedded_query: string | null; query_embedding: string | null; system_prompt: string }, c: AgentCriteria) {
  const q = (c.semantic_query || a.system_prompt || (c.keywords ?? []).join(" ")).trim();
  if (a.embedded_query === q && a.query_embedding) return JSON.parse(a.query_embedding) as number[];
  const [v] = await embed([q]);
  await admin.from("ai_agents").update({ query_embedding: toVec(v!), embedded_query: q }).eq("id", a.id);
  return v!;
}

export async function runAgent(admin: Admin, agentId: string) {
  const { data: a } = await admin.from("ai_agents").select("*").eq("id", agentId).maybeSingle();
  if (!a) return null;
  const c = a.criteria_config as unknown as AgentCriteria;
  try {
    const vec = await agentVector(admin, a, c);
    const { scanned, hits } = await evaluateAgent(admin, c, vec);
    if (hits.length) await admin.from("agent_hits").upsert(hits.map((h) => ({ agent_id: a.id, item_id: h.item_id, similarity: h.similarity })), { onConflict: "agent_id,item_id", ignoreDuplicates: true });
    const precision = scanned ? hits.length / scanned : null;
    await admin.from("agent_runs").insert({ agent_id: a.id, scanned, hits: hits.length, precision, status: "ok", log: `Scanned ${scanned}, curated ${hits.length}` });
    await admin.from("ai_agents").update({ last_run_at: new Date().toISOString() }).eq("id", a.id);
    return { scanned, hits: hits.length };
  } catch (e) {
    console.error("agent run failed", a.id, e);
    await admin.from("agent_runs").insert({ agent_id: a.id, status: "error", log: e instanceof Error ? e.message.slice(0, 300) : "failed" });
    await admin.from("ai_agents").update({ last_run_at: new Date().toISOString() }).eq("id", a.id);
    return { scanned: 0, hits: 0, error: true };
  }
}

/** Scheduled tick: bounded embeddings batch + up to 10 due agents, single-flight. */
export async function agentTick(admin: Admin) {
  const { data: locked } = await admin.rpc("acquire_lease", { p_name: "agent-tick", p_seconds: 240 });
  if (!locked) return { skipped: true };
  const emb = await processEmbeddingQueue(admin);
  const { data: agents } = await admin.from("ai_agents").select("id, last_run_at, criteria_config").eq("is_active", true).order("last_run_at", { ascending: true, nullsFirst: true }).limit(50);
  const due = (agents ?? []).filter((a) => !a.last_run_at || Date.now() - new Date(a.last_run_at).getTime() >= intervalMs((a.criteria_config as unknown as AgentCriteria).run_interval) - 60e3).slice(0, 10);
  let runs = 0;
  for (const a of due) { await runAgent(admin, a.id); runs++; }
  await admin.from("job_leases").update({ locked_until: new Date().toISOString() }).eq("name", "agent-tick");
  return { embedded: emb.embedded, runs };
}

function responseText(res: unknown) {
  const out = (res as { output?: { type: string; content?: { type: string; text?: string }[] }[] }).output ?? [];
  return out.flatMap((o) => o.content ?? []).filter((c) => c.type === "output_text").map((c) => c.text ?? "").join("");
}

export async function writeText(instructions: string, input: string) {
  const res = await generateResponse({ model: "openai/gpt-6-astra", instructions, input, reasoning: { effort: "low" } });
  return responseText(res).trim();
}

export async function buildDailyBrief(admin: Admin, day: string) {
  const { data: existing } = await admin.from("audio_briefs").select("*").eq("day", day).maybeSingle();
  if (existing) return existing;
  const since = new Date(Date.now() - 72 * 3600e3).toISOString();
  let { data: items } = await admin.from("trending_items").select("id, title_or_snippet, author_handle, category, rank_score").gte("created_at", since).order("rank_score", { ascending: false }).limit(5);
  if (!items || items.length < 5) ({ data: items } = await admin.from("trending_items").select("id, title_or_snippet, author_handle, category, rank_score").order("rank_score", { ascending: false }).limit(5));
  const top = items ?? [];
  if (!top.length) throw new Error("No items to brief");
  const script = await writeText(
    "You write the 'Xtrnd Daily Signal' audio brief: a crisp, warm, 3-minute spoken script (about 420 words). Open with one line intro, cover each item in order with why it matters, close in one line. Plain prose only — no markdown, lists, emojis or URLs. Never invent facts beyond the given text.",
    top.map((t, n) => `${n + 1}. ${t.author_handle} (${t.category}): ${t.title_or_snippet.slice(0, 600)}`).join("\n\n"),
  );
  const audio = await generateSpeech({
    model: "google/gemini-3.1-flash-tts-preview",
    contents: [{ role: "user", parts: [{ text: `Read this as a calm, confident tech news host:\n\n${script}` }] }],
    generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } } } },
  });
  const blob = await audio.blob();
  const path = `${day}.wav`;
  const { error: upErr } = await admin.storage.from("audio-briefs").upload(path, blob, { contentType: audio.contentType || "audio/wav", upsert: true });
  if (upErr) throw new Error(upErr.message);
  const { data: row, error } = await admin.from("audio_briefs").upsert({ day, item_ids: top.map((t) => t.id), script, storage_path: path }).select("*").single();
  if (error) throw new Error(error.message);
  return row;
}

export { parseNaturalQuery };
