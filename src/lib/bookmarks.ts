import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "./xtrnd";

export function useBookmarks() {
  const { session } = useSession();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const uid = session?.user.id;
  const q = useQuery({
    queryKey: ["bookmarks", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_bookmarks").select("item_id");
      if (error) throw error;
      return new Set(data.map((d) => d.item_id));
    },
  });
  const ids = q.data ?? new Set<string>();
  const toggle = async (itemId: string) => {
    if (!uid) { toast("Sign in to save items"); navigate({ to: "/auth" }); return; }
    const { error } = ids.has(itemId)
      ? await supabase.from("user_bookmarks").delete().eq("item_id", itemId).eq("user_id", uid)
      : await supabase.from("user_bookmarks").insert({ item_id: itemId, user_id: uid });
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["bookmarks"] });
  };
  return { ids, toggle, session, loading: q.isLoading };
}
