import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "./xtrnd";

const KEY = "xtrnd-ws";
const EVT = "xtrnd:ws";

export function setActiveWorkspace(id: string | null) {
  if (id) localStorage.setItem(KEY, id); else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVT));
}

export function useWorkspaces() {
  const { session } = useSession();
  const uid = session?.user.id;
  const q = useQuery({
    queryKey: ["workspaces", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from("workspace_members").select("role, workspaces(id, name, owner_id)").eq("user_id", uid!);
      if (error) throw error;
      return (data ?? []).flatMap((r) => (r.workspaces ? [{ ...r.workspaces, role: r.role }] : []));
    },
  });
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const read = () => setActive(localStorage.getItem(KEY));
    read();
    window.addEventListener(EVT, read);
    return () => window.removeEventListener(EVT, read);
  }, []);
  const list = q.data ?? [];
  const current = list.find((w) => w.id === active) ?? null;
  return { session, workspaces: list, current, refetch: q.refetch };
}
