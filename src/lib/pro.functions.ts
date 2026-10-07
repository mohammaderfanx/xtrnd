import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Rules = { keywords?: string[]; exclude?: string[]; match?: "any" | "all"; min_engagement?: number; categories?: string[]; handles?: string[]; types?: string[] };
type ItemLite = { id: string; title_or_snippet: string; author_handle: string; category: string; type: string; external_url: string; metrics: unknown };

export function matchesRules(item: ItemLite, r: Rules) {
  const text = `${item.title_or_snippet} ${item.author_handle}`.toLowerCase();
  const score = Number((item.metrics as { engagement_score?: number })?.engagement_score ?? 0);
  if (r.min_engagement && score < r.min_engagement) return false;
  if (r.categories?.length && !r.categories.includes(item.category)) return false;
  if (r.types?.length && !r.types.includes(item.type)) return false;
  if (r.handles?.length && !r.handles.map((h) => h.toLowerCase().replace(/^@?/, "@")).includes(item.author_handle.toLowerCase())) return false;
  if (r.exclude?.some((k) => k && text.includes(k.toLowerCase()))) return false;
  const kws = (r.keywords ?? []).filter(Boolean).map((k) => k.toLowerCase());
  if (!kws.length) return true;
  return r.match === "all" ? kws.every((k) => text.includes(k)) : kws.some((k) => text.includes(k));
}

/** Demo plan switch. Real Stripe checkout will replace this; until then anyone can toggle their own plan. */
export const setDemoPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tier: z.enum(["Free", "Pro", "Enterprise"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("user_subscriptions").upsert({
      user_id: context.userId, plan_tier: data.tier, status: "active",
      current_period_end: data.tier === "Free" ? null : new Date(Date.now() + 30 * 864e5).toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const summarizeItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ itemId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Cache first: popular items never hit the model twice.
    const { data: cached } = await context.supabase.from("ai_item_insights").select("*").eq("item_id", data.itemId).maybeSingle();
    if (cached) return { ok: true as const, insight: cached, cached: true };

    const { data: item } = await context.supabase.from("trending_items").select("*").eq("id", data.itemId).maybeSingle();
    if (!item) return { ok: false as const, error: "This item no longer exists." };

    const { data: credit, error: cErr } = await context.supabase.rpc("consume_ai_credit");
    if (cErr) return { ok: false as const, error: "Couldn't check your plan." };
    if (credit === 0) return { ok: false as const, error: "You've used your 3 free AI summaries today. Upgrade to Pro for unlimited.", paywall: true };

    const { synthesize, fetchFreshText, GatewayError } = await import("./ai.server");
    const fresh = await fetchFreshText(item.external_url);
    const text = fresh && fresh.length > item.title_or_snippet.length ? fresh : item.title_or_snippet;
    try {
      const insight = await synthesize(text, { handle: item.author_handle, type: item.type, category: item.category });
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: saved, error } = await supabaseAdmin.from("ai_item_insights")
        .upsert({ item_id: item.id, ...insight, generated_at: new Date().toISOString() }, { onConflict: "item_id" })
        .select("*").single();
      if (error) throw new Error(error.message);
      return { ok: true as const, insight: saved, cached: false };
    } catch (e) {
      console.error("summarize failed", e);
      return { ok: false as const, error: e instanceof GatewayError ? e.message : "AI synthesis failed. Try again shortly." };
    }
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ name: z.string().trim().min(1).max(60) }).parse(d))
  .handler(async ({ data, context }) => {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const raw = "xt_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw))), (b) => b.toString(16).padStart(2, "0")).join("");
    const { error } = await context.supabase.from("api_keys").insert({
      user_id: context.userId, name: data.name, key_hash: hash, key_prefix: raw.slice(0, 10),
    });
    if (error) return { ok: false as const, error: error.message.includes("row-level") ? "API keys require Pro." : error.message };
    return { ok: true as const, key: raw };
  });

function validWebhook(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (/(^|\.)discord(app)?\.com$/.test(u.hostname) || u.hostname === "hooks.slack.com");
  } catch { return false; }
}

async function postWebhook(url: string, title: string, items: ItemLite[]) {
  const lines = items.map((i) => `• ${i.author_handle}: ${i.title_or_snippet.slice(0, 180)}\n  ${i.external_url}`).join("\n");
  const content = `⚡ Xtrnd signal — ${title}\n${lines}`.slice(0, 1900);
  const body = new URL(url).hostname === "hooks.slack.com" ? { text: content } : { content };
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(5000) });
  return r.ok;
}

export const testWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ feedId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: feed } = await context.supabase.from("custom_signal_feeds").select("*").eq("id", data.feedId).maybeSingle();
    if (!feed?.webhook_url) return { ok: false, error: "No webhook set" };
    if (!validWebhook(feed.webhook_url)) return { ok: false, error: "Only Discord or Slack webhook links are allowed" };
    const { data: items } = await context.supabase.from("trending_items").select("*").order("created_at", { ascending: false }).limit(50);
    const hits = (items ?? []).filter((i) => matchesRules(i, feed.filter_rules as Rules)).slice(0, 3);
    try {
      const ok = await postWebhook(feed.webhook_url, `${feed.name} (test)`, hits.length ? hits : (items ?? []).slice(0, 1));
      return ok ? { ok: true } : { ok: false, error: "Webhook rejected the message" };
    } catch { return { ok: false, error: "Couldn't reach the webhook" }; }
  });

/** Called after a new item is published: pushes it to every matching Pro feed's webhook. */
export const dispatchFeeds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ itemId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: item } = await supabaseAdmin.from("trending_items").select("*").eq("id", data.itemId).maybeSingle();
    if (!item || Date.now() - new Date(item.created_at).getTime() > 10 * 60e3) return { sent: 0 };
    const { data: feeds } = await supabaseAdmin.from("custom_signal_feeds").select("*").not("webhook_url", "is", null);
    let sent = 0;
    for (const f of feeds ?? []) {
      if (!f.webhook_url || !validWebhook(f.webhook_url) || !matchesRules(item, f.filter_rules as Rules)) continue;
      const { data: pro } = await supabaseAdmin.rpc("is_pro", { _uid: f.user_id });
      if (!pro) continue;
      try { if (await postWebhook(f.webhook_url, f.name, [item])) sent++; } catch {}
    }
    return { sent };
  });
