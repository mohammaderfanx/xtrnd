import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "./xtrnd";

export function useBookmarks() {
  const { session } = useSession();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const uid = session?.user.id;
  const key = ["bookmarks", uid];
  const q = useQuery({
    queryKey: key,
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_bookmarks").select("item_id");
      if (error) throw error;
      return new Set(data.map((d) => d.item_id));
    },
  });

  const m = useMutation({
    mutationFn: async ({ itemId, saved }: { itemId: string; saved: boolean }) => {
      const { error } = saved
        ? await supabase.from("user_bookmarks").delete().eq("item_id", itemId).eq("user_id", uid!)
        : await supabase.from("user_bookmarks").insert({ item_id: itemId, user_id: uid! });
      if (error) throw error;
    },
    onMutate: async ({ itemId, saved }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Set<string>>(key);
      const next = new Set(prev);
      saved ? next.delete(itemId) : next.add(itemId);
      qc.setQueryData(key, next);
      qc.setQueryData<Record<string, number>>(["saves"], (s) => s && { ...s, [itemId]: Math.max(0, (s[itemId] ?? 0) + (saved ? -1 : 1)) });
      return { prev };
    },
    onError: (e, _v, ctx) => { qc.setQueryData(key, ctx?.prev); toast.error((e as Error).message); },
    onSettled: () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ["saves"] }); },
  });

  const ids = q.data ?? new Set<string>();
  const toggle = (itemId: string) => {
    if (!uid) { toast("Sign in to save items"); navigate({ to: "/auth" }); return; }
    m.mutate({ itemId, saved: ids.has(itemId) });
  };
  return { ids, toggle, session, loading: q.isLoading };
}
