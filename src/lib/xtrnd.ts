import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Item = Database["public"]["Tables"]["trending_items"]["Row"] & { rank_score?: number | null };
export type ItemType = Database["public"]["Enums"]["item_type"];
export type Category = Database["public"]["Enums"]["item_category"];
export type Metrics = { likes: number; retweets: number; views: number; engagement_score: number };
export type Curator = Database["public"]["Tables"]["curator_profiles"]["Row"];
export type Velocity = "Viral" | "Rising" | "Evergreen" | null;

export const CATEGORIES: Category[] = ["AI & Tech", "SaaS & Startups", "Design & UX", "Finance", "Crypto"];
export const TYPES: ItemType[] = ["Post", "Account", "Thread", "Community", "Media"];

export const fmt = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : `${Math.round(n)}`;
export const metricsOf = (i: Item) => i.metrics as unknown as Metrics;

export const itemsQuery = {
  queryKey: ["items"],
  staleTime: 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.from("trending_items").select("*, rank_score").order("created_at", { ascending: false });
    if (error) throw error;
    return data as unknown as Item[];
  },
};

export const historyQuery = {
  queryKey: ["history"],
  staleTime: 60_000,
  queryFn: async () => {
    const since = new Date(Date.now() - 25 * 3600e3).toISOString();
    const { data, error } = await supabase.from("item_analytics_history")
      .select("item_id, recorded_at, views_count").gte("recorded_at", since).order("recorded_at");
    if (error) throw error;
    return data;
  },
};

export const savesQuery = {
  queryKey: ["saves"],
  staleTime: 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.rpc("bookmark_counts");
    if (error) throw error;
    return Object.fromEntries((data ?? []).map((r) => [r.item_id, Number(r.saves)])) as Record<string, number>;
  },
};

export const curatorsQuery = {
  queryKey: ["curators"],
  staleTime: 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.from("curator_profiles").select("*").order("reputation_score", { ascending: false });
    if (error) throw error;
    return data;
  },
};

type Snap = { item_id: string; recorded_at: string; views_count: number };

/** Viral: >=40% of views landed in the last 6h. Rising: >=30% in 24h. Evergreen: high save-to-view ratio or older proven item. */
export function velocityOf(item: Item, history: Snap[], saves: number): Velocity {
  const m = metricsOf(item);
  const snaps = history.filter((h) => h.item_id === item.id);
  const now = Date.now();
  const viewsAt = (hoursAgo: number) => {
    const cut = now - hoursAgo * 3600e3;
    if (new Date(item.created_at).getTime() >= cut) return 0;
    const before = snaps.filter((s) => new Date(s.recorded_at).getTime() <= cut);
    return before.length ? Number(before[before.length - 1]!.views_count) : null;
  };
  const v6 = viewsAt(6), v24 = viewsAt(24);
  if (m.views > 0 && v6 !== null && (m.views - v6) / m.views >= 0.4 && m.views >= 250_000) return "Viral";
  if (m.views > 0 && v24 !== null && (m.views - v24) / m.views >= 0.3) return "Rising";
  const ageH = (now - new Date(item.created_at).getTime()) / 3600e3;
  if ((m.views && saves / m.views >= 1e-5) || (ageH > 48 && m.engagement_score >= 80)) return "Evergreen";
  return null;
}

/** Fuzzy match: every query token must appear, or be a subsequence of the haystack word. */
export function fuzzy(hay: string, q: string) {
  const h = hay.toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((tok) => {
    if (h.includes(tok)) return true;
    return h.split(/\s+/).some((w) => { let i = 0; for (const c of w) if (c === tok[i]) i++; return i === tok.length && tok.length > 2; });
  });
}

export function detectType(url: string): ItemType {
  try {
    const u = new URL(url);
    const p = u.pathname.split("/").filter(Boolean);
    if (p.includes("communities")) return "Community";
    if (p.includes("status")) return "Post";
    if (p.length === 1) return "Account";
  } catch {}
  return "Post";
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, ready };
}
