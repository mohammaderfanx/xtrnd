import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, X-API-Key, Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const preflight = () => new Response(null, { status: 204, headers: CORS });

export function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { ...CORS, "Cache-Control": "no-store", ...extra } });
}

/** Validates the API key and consumes one unit of its per-minute quota. */
export async function authorize(request: Request) {
  const raw = request.headers.get("x-api-key") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!/^xt_[a-f0-9]{48}$/.test(raw)) return { error: json({ error: "Missing or invalid API key" }, 401) };
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw))), (b) => b.toString(16).padStart(2, "0")).join("");
  const sb = publicClient();
  const { data, error } = await sb.rpc("api_authorize", { p_hash: hash });
  const r = data?.[0];
  if (error || !r) return { error: json({ error: "Auth service unavailable" }, 503) };
  const headers = {
    "X-RateLimit-Limit": String(r.lim), "X-RateLimit-Remaining": String(Math.max(0, r.remaining)),
    "X-RateLimit-Reset": String(Math.floor(new Date(r.reset_at).getTime() / 1000)),
  };
  if (!r.allowed) {
    const msg = r.status === 429 ? "Rate limit exceeded" : r.status === 402 ? "API access requires an active Pro plan" : "Invalid API key";
    return { error: json({ error: msg }, r.status, r.status === 429 ? { ...headers, "Retry-After": "60" } : headers) };
  }
  return { sb, headers };
}

export function shape(i: Database["public"]["Tables"]["trending_items"]["Row"] & { rank_score?: number | null }) {
  return {
    id: i.id, type: i.type, category: i.category, text: i.title_or_snippet,
    author: { handle: i.author_handle, name: i.author_name, avatar: i.author_avatar },
    url: i.external_url, metrics: i.metrics, rank_score: i.rank_score ?? null, created_at: i.created_at,
  };
}
