import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseNaturalQuery, type AgentCriteria } from "./intel-rules";

const friendly = (e: unknown, fallback: string) => {
  const name = (e as { name?: string })?.name;
  if (name === "PaymentRequiredError") return "AI credits are used up for this workspace.";
  if (name === "RateLimitError") return "AI is busy right now, try again in a minute.";
  return fallback;
};

/** Hybrid semantic + full-text search over embedded items. */
export const semanticSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ q: z.string().trim().min(2).max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    const { embed, toVec } = await import("./intel.server");
    const { days, types } = parseNaturalQuery(data.q);
    try {
      const [v] = await embed([data.q]);
      const { data: rows, error } = await context.supabase.rpc("hybrid_search", {
        query_embedding: toVec(v!), query_text: data.q, match_count: 24,
        ...(days ? { since: new Date(Date.now() - days * 864e5).toISOString() } : {}),
        ...(types.length ? { item_types: types } : {}),
      });
      if (error) throw new Error(error.message);
      return { ok: true as const, results: (rows ?? []).map((r) => ({ id: r.item_id, score: r.score, similarity: r.similarity })), days, types };
    } catch (e) {
      console.error("semantic search failed", e);
      return { ok: false as const, error: friendly(e, "Semantic search failed. Try again.") };
    }
  });

/** Non-blocking nudge after a submission: embeds a small queued batch. */
export const kickEmbeddings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { processEmbeddingQueue } = await import("./intel.server");
    return processEmbeddingQueue(supabaseAdmin, 8);
  });

const criteriaSchema = z.object({
  keywords: z.array(z.string().trim().max(40)).max(12),
  min_followers: z.number().int().min(0).max(1e9),
  semantic_query: z.string().trim().max(300),
  run_interval: z.enum(["15m", "1h", "6h", "1d"]),
});

/** Live preview: what an agent would curate right now, without saving. */
export const testAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ system_prompt: z.string().max(2000), criteria: criteriaSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { embed, evaluateAgent } = await import("./intel.server");
    const q = (data.criteria.semantic_query || data.system_prompt || data.criteria.keywords.join(" ")).trim();
    if (!q) return { ok: false as const, error: "Describe what the agent should find." };
    try {
      const [v] = await embed([q]);
      const { scanned, hits } = await evaluateAgent(context.supabase, data.criteria as AgentCriteria, v!);
      return { ok: true as const, scanned, hits: hits.map((h) => ({ id: h.item_id, similarity: h.similarity })) };
    } catch (e) {
      console.error("agent preview failed", e);
      return { ok: false as const, error: friendly(e, "Preview failed. Try again.") };
    }
  });

export const runAgentNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ agentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: own } = await context.supabase.from("ai_agents").select("id, last_run_at").eq("id", data.agentId).maybeSingle();
    if (!own) return { ok: false as const, error: "Agent not found" };
    if (own.last_run_at && Date.now() - new Date(own.last_run_at).getTime() < 60e3) return { ok: false as const, error: "Wait a minute between manual runs." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runAgent } = await import("./intel.server");
    const r = await runAgent(supabaseAdmin, data.agentId);
    return r && !("error" in r) ? { ok: true as const, ...r } : { ok: false as const, error: "Agent run failed — see the log." };
  });

const today = () => new Date().toISOString().slice(0, 10);

/** Public: latest cached brief with a short-lived audio link. */
export const getDailyBrief = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: b } = await supabaseAdmin.from("audio_briefs").select("day, item_ids, script, storage_path").order("day", { ascending: false }).limit(1).maybeSingle();
  if (!b) return { brief: null, isToday: false };
  const { data: s } = await supabaseAdmin.storage.from("audio-briefs").createSignedUrl(b.storage_path, 3600);
  return { brief: { day: b.day, script: b.script, itemIds: b.item_ids, url: s?.signedUrl ?? null }, isToday: b.day === today() };
});

/** Generates today's brief once; later calls reuse the cached audio. */
export const generateDailyBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { buildDailyBrief } = await import("./intel.server");
    const { data: lock } = await supabaseAdmin.rpc("acquire_lease", { p_name: `brief-${today()}`, p_seconds: 180 });
    const { data: cached } = await supabaseAdmin.from("audio_briefs").select("day").eq("day", today()).maybeSingle();
    if (!cached && !lock) return { ok: false as const, error: "Today's brief is already being generated — check back in a minute." };
    try {
      await buildDailyBrief(supabaseAdmin, today());
      return { ok: true as const };
    } catch (e) {
      console.error("brief failed", e);
      await supabaseAdmin.from("job_leases").update({ locked_until: new Date().toISOString() }).eq("name", `brief-${today()}`);
      return { ok: false as const, error: friendly(e, "Couldn't generate the audio brief.") };
    }
  });

export const linkedinDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ itemIds: z.array(z.string().uuid()).min(1).max(10) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: items } = await context.supabase.from("trending_items").select("author_handle, title_or_snippet, external_url").in("id", data.itemIds);
    if (!items?.length) return { ok: false as const, error: "No items selected" };
    const { data: credit } = await context.supabase.rpc("consume_ai_credit");
    if (credit === 0) return { ok: false as const, error: "You've used your free AI credits today. Upgrade to Pro for unlimited." };
    const { writeText } = await import("./intel.server");
    try {
      const text = await writeText(
        "Write a LinkedIn post (120-220 words) synthesizing these X.com signals for a professional audience. Hook first line, short paragraphs, 3 concise takeaways, credit authors by handle, end with a question. No hashtags spam (max 3). Don't invent facts.",
        items.map((i) => `${i.author_handle}: ${i.title_or_snippet.slice(0, 600)} (${i.external_url})`).join("\n\n"),
      );
      return { ok: true as const, text };
    } catch (e) {
      console.error("linkedin draft failed", e);
      return { ok: false as const, error: friendly(e, "Couldn't write the draft.") };
    }
  });

export const sendToSlack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ webhook: z.string().url().max(300), text: z.string().min(1).max(3500) }).parse(d))
  .handler(async ({ data }) => {
    const u = new URL(data.webhook);
    if (u.protocol !== "https:" || u.hostname !== "hooks.slack.com") return { ok: false as const, error: "Use a Slack incoming webhook link (hooks.slack.com)." };
    try {
      const r = await fetch(u, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: data.text }), signal: AbortSignal.timeout(5000) });
      return r.ok ? { ok: true as const } : { ok: false as const, error: `Slack rejected the message (${r.status})` };
    } catch { return { ok: false as const, error: "Couldn't reach Slack" }; }
  });
