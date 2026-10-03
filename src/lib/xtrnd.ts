import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Item = Database["public"]["Tables"]["trending_items"]["Row"];
export type ItemType = Database["public"]["Enums"]["item_type"];
export type Category = Database["public"]["Enums"]["item_category"];
export type Metrics = { likes: number; retweets: number; views: number; engagement_score: number };

export const CATEGORIES: Category[] = ["AI & Tech", "SaaS & Startups", "Design & UX", "Finance", "Crypto"];
export const TYPES: ItemType[] = ["Post", "Account", "Thread", "Community", "Media"];

export const fmt = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : `${n}`;

export const itemsQuery = {
  queryKey: ["items"],
  queryFn: async () => {
    const { data, error } = await supabase.from("trending_items").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
};

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
