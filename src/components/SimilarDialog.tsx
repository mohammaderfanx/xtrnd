import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar } from "./ItemBits";
import type { Item } from "@/lib/xtrnd";
import { useSession } from "@/lib/xtrnd";

export function SimilarDialog({ item, onClose }: { item: Item | null; onClose: () => void }) {
  const { session } = useSession();
  const { data, isLoading } = useQuery({
    queryKey: ["similar", item?.id, session?.user.id],
    enabled: !!item && !!session,
    staleTime: 5 * 60e3,
    queryFn: async () => {
      if (!item) return [];
      const { data: sims, error } = await supabase.rpc("similar_items", { p_item_id: item.id, match_count: 5 });
      if (error) throw error;
      const ids = (sims ?? []).map((s) => s.item_id);
      if (!ids.length) return [];
      const { data: items } = await supabase.from("trending_items").select("*").in("id", ids);
      return (sims ?? []).flatMap((s) => { const i = items?.find((x) => x.id === s.item_id); return i ? [{ item: i, sim: s.similarity }] : []; });
    },
  });
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-pro" />Similar signals</DialogTitle></DialogHeader>
        <p className="line-clamp-2 text-xs text-muted-foreground">Semantically related to: {item?.title_or_snippet}</p>
        <div className="divide-y rounded-md border">
          {!session ? <p className="p-4 text-sm text-muted-foreground">Sign in to find similar signals.</p>
            : isLoading ? <p className="p-4 text-sm text-muted-foreground">Clustering…</p>
            : !data?.length ? <p className="p-4 text-sm text-muted-foreground">This item hasn't been indexed yet — try again in a few minutes.</p>
            : data.map(({ item: i, sim }) => (
              <a key={i.id} href={i.external_url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 p-3 hover:bg-accent">
                <Avatar src={i.author_avatar} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground"><span className="text-foreground">{i.author_handle}</span>· {i.type}<span className="ml-auto text-pro">{Math.round(sim * 100)}% match</span></div>
                  <p className="line-clamp-2 text-sm">{i.title_or_snippet}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
