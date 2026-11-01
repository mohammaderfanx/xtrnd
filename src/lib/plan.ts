import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "./xtrnd";

export type Tier = "Free" | "Pro" | "Enterprise";
export const FREE_AI_PER_DAY = 3;

export function usePlan() {
  const { session, ready } = useSession();
  const uid = session?.user.id;
  const q = useQuery({
    queryKey: ["plan", uid],
    enabled: !!uid,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [{ data: sub }, { data: usage }] = await Promise.all([
        supabase.from("user_subscriptions").select("*").maybeSingle(),
        supabase.from("ai_usage").select("count").eq("day", today).maybeSingle(),
      ]);
      const active = sub && ["active", "trialing"].includes(sub.status) && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
      const tier: Tier = active && sub ? sub.plan_tier : "Free";
      return { tier, sub, aiUsed: usage?.count ?? 0 };
    },
  });
  const tier = q.data?.tier ?? "Free";
  return { session, ready, tier, isPro: tier !== "Free", aiUsed: q.data?.aiUsed ?? 0, sub: q.data?.sub ?? null, loading: q.isLoading };
}

export const insightQuery = (itemId: string) => ({
  queryKey: ["insight", itemId],
  staleTime: 5 * 60_000,
  queryFn: async () => {
    const { data } = await supabase.from("ai_item_insights").select("*").eq("item_id", itemId).maybeSingle();
    return data;
  },
});

export const itemHistoryQuery = (itemId: string) => ({
  queryKey: ["item-history", itemId],
  queryFn: async () => {
    const { data } = await supabase.from("item_analytics_history").select("recorded_at, views_count, likes_count").eq("item_id", itemId).order("recorded_at");
    return data ?? [];
  },
});
