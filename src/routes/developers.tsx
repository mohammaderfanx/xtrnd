import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { KeyRound, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createApiKey } from "@/lib/pro.functions";
import { usePlan } from "@/lib/plan";
import { ProBadge, ProGate } from "@/components/ProBadge";

export const Route = createFileRoute("/developers")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Developer API — Xtrnd" },
      { name: "description", content: "Query Xtrnd's high-signal X.com database programmatically with API keys and per-minute rate limits." },
      { property: "og:title", content: "Developer API — Xtrnd" },
      { property: "og:description", content: "A REST API for the best of X.com, built for agents and tools." },
    ],
  }),
  component: Developers,
});

function Developers() {
  const { session, isPro, ready } = usePlan();
  const qc = useQueryClient();
  const create = useServerFn(createApiKey);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const { data: keys = [] } = useQuery({
    queryKey: ["api-keys", session?.user.id], enabled: !!session,
    queryFn: async () => (await supabase.from("api_keys").select("id, name, key_prefix, rate_limit_per_min, last_used_at, created_at").order("created_at", { ascending: false })).data ?? [],
  });
  const [origin, setOrigin] = useState("https://your-app");
  useEffect(() => setOrigin(window.location.origin), []);

  const make = async () => {
    const r = await create({ data: { name: name || "Default key" } });
    if (!r.ok) { toast.error(r.error); return; }
    setFresh(r.key); setName(""); qc.invalidateQueries({ queryKey: ["api-keys"] });
  };
  const copy = async (t: string) => { await navigator.clipboard.writeText(t); toast.success("Copied"); };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center gap-2"><h1 className="text-3xl font-semibold tracking-tight">Developer API</h1><ProBadge /></div>
      <p className="mt-1 text-sm text-muted-foreground">Let agents and tools pull Xtrnd's curated signal. Keys are rate-limited per minute.</p>

      <section className="mt-8">
        {ready && !session ? (
          <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground"><Link to="/auth" className="text-pro hover:underline">Sign in</Link> to manage API keys.</p>
        ) : !isPro ? (
          <ProGate title="API access is part of Pro" body="Pro includes 60 requests/minute; Enterprise raises it to 600." />
        ) : (
          <div className="space-y-4">
            {fresh && (
              <div className="glass rounded-lg p-4">
                <div className="text-sm font-medium">Your new key — copy it now, it won't be shown again.</div>
                <div className="mt-2 flex items-center gap-2"><code className="flex-1 truncate rounded bg-background px-3 py-2 font-mono text-xs">{fresh}</code>
                  <button onClick={() => copy(fresh)} className="rounded-md border px-3 py-2 hover:bg-accent" aria-label="Copy key"><Copy className="h-4 w-4" /></button></div>
              </div>
            )}
            <div className="flex gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name, e.g. Research agent" className="h-9 flex-1 rounded-md border bg-card px-3 text-sm outline-none focus:border-ring" />
              <button onClick={make} className="flex items-center gap-1.5 rounded-md bg-pro px-3 text-sm font-semibold text-pro-foreground"><KeyRound className="h-4 w-4" />Create key</button>
            </div>
            <div className="overflow-hidden rounded-lg border">
              {keys.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No keys yet.</p> : keys.map((k) => (
                <div key={k.id} className="flex items-center gap-3 border-b px-4 py-3 text-sm last:border-0">
                  <span className="font-medium">{k.name}</span>
                  <code className="font-mono text-xs text-muted-foreground">{k.key_prefix}…</code>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">{k.rate_limit_per_min}/min · {k.last_used_at ? `used ${new Date(k.last_used_at).toLocaleString()}` : "never used"}</span>
                  <button aria-label="Revoke key" onClick={async () => { await supabase.from("api_keys").delete().eq("id", k.id); qc.invalidateQueries({ queryKey: ["api-keys"] }); toast.success("Key revoked"); }}
                    className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="mt-12 space-y-6 text-sm">
        <h2 className="text-xl font-semibold">Reference</h2>
        <div className="space-y-2">
          <div className="font-mono text-xs"><span className="text-signal">GET</span> /api/public/v1/trending</div>
          <p className="text-muted-foreground">Top items by decay-adjusted rank. Params: <code>limit</code> (1–50), <code>hours</code>.</p>
        </div>
        <div className="space-y-2">
          <div className="font-mono text-xs"><span className="text-signal">GET</span> /api/public/v1/feed</div>
          <p className="text-muted-foreground">Newest items with filters: <code>type</code>, <code>category</code>, <code>q</code>, <code>min_score</code>, <code>limit</code> (1–100), <code>before</code> (ISO date for paging).</p>
        </div>
        <pre className="overflow-x-auto rounded-lg border bg-card p-4 font-mono text-xs">{`curl "${origin}/api/public/v1/trending?limit=5" \\
  -H "X-API-Key: xt_your_key"`}</pre>
        <p className="text-muted-foreground">Responses include <code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code> and <code>X-RateLimit-Reset</code>. Exceeding your limit returns <code>429</code> with <code>Retry-After</code>; an inactive plan returns <code>402</code>.</p>
      </section>
    </main>
  );
}
