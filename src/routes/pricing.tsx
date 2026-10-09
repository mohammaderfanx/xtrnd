import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, Minus } from "lucide-react";
import { toast } from "sonner";
import { setDemoPlan } from "@/lib/pro.functions";
import { usePlan, type Tier } from "@/lib/plan";
import { ProBadge } from "@/components/ProBadge";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Xtrnd Pro" },
      { name: "description", content: "Free, Pro ($19/mo) and Enterprise plans: AI thread summaries, custom signal feeds, exports and API access." },
      { property: "og:title", content: "Pricing — Xtrnd Pro" },
      { property: "og:description", content: "Unlimited AI summaries, custom signal feeds and a developer API for X.com signal." },
    ],
  }),
  component: Pricing,
});

const PLANS: { tier: Tier; price: string; sub: string; blurb: string; cta: string }[] = [
  { tier: "Free", price: "$0", sub: "forever", blurb: "Browse, filter and save the best of X.", cta: "Current basics" },
  { tier: "Pro", price: "$19", sub: "/ month", blurb: "For creators and analysts who live on signal.", cta: "Upgrade to Pro" },
  { tier: "Enterprise", price: "Custom", sub: "annual", blurb: "Higher API limits, team seats and SLAs.", cta: "Switch to Enterprise" },
];

const MATRIX: [string, string | boolean, string | boolean, string | boolean][] = [
  ["Curated feed, filters & bookmarks", true, true, true],
  ["AI thread summaries", "3 / day", "Unlimited", "Unlimited"],
  ["Custom Signal Feeds", false, "Unlimited", "Unlimited"],
  ["Discord / Slack alerts", false, true, true],
  ["Signal Digest newsletter builder", true, true, true],
  ["Compact list view & export", true, true, true],
  ["Developer API access", false, "60 req/min", "600 req/min"],
  ["Priority support", false, false, true],
];

function Cell({ v }: { v: string | boolean }) {
  if (v === true) return <Check className="mx-auto h-4 w-4 text-signal" />;
  if (v === false) return <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" />;
  return <span className="block text-center font-mono text-xs">{v}</span>;
}

function Pricing() {
  const { session, tier, sub } = usePlan();
  const qc = useQueryClient();
  const setPlan = useServerFn(setDemoPlan);
  const [busy, setBusy] = useState<Tier | null>(null);

  const choose = async (t: Tier) => {
    setBusy(t);
    try { await setPlan({ data: { tier: t } }); await qc.invalidateQueries({ queryKey: ["plan"] }); toast.success(`You're on ${t}`); }
    catch { toast.error("Couldn't change plan"); }
    finally { setBusy(null); }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-pro">● Xtrnd Pro</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Extract the signal. Skip the scroll.</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">AI summaries, custom alerts and API access for people who need X.com intelligence, not another feed.</p>
        <p className="mx-auto mt-4 inline-block rounded-md border border-hot/30 bg-hot/10 px-3 py-1.5 font-mono text-xs text-hot">Demo mode: card payments aren't connected yet, so plan changes are free and instant.</p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => {
          const current = session && tier === p.tier;
          const featured = p.tier === "Pro";
          return (
            <div key={p.tier} className={`relative flex flex-col rounded-xl p-6 ${featured ? "glass shadow-[0_0_60px_-20px_var(--pro)]" : "border bg-card"}`}>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{p.tier}</h2>
                {featured && <ProBadge label="MOST POPULAR" />}
                {current && <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-signal">● Current</span>}
              </div>
              <div className="mt-4 flex items-baseline gap-1"><span className="text-4xl font-semibold">{p.price}</span><span className="text-sm text-muted-foreground">{p.sub}</span></div>
              <p className="mt-2 text-sm text-muted-foreground">{p.blurb}</p>
              <div className="mt-6 flex-1" />
              {!session ? (
                <Link to="/auth" className="rounded-md border px-4 py-2 text-center text-sm font-medium hover:bg-accent">Sign in to choose</Link>
              ) : current ? (
                <div className="rounded-md border px-4 py-2 text-center font-mono text-xs text-muted-foreground">
                  {sub?.current_period_end && p.tier !== "Free" ? `Renews ${new Date(sub.current_period_end).toLocaleDateString()}` : "Your plan"}
                </div>
              ) : (
                <button onClick={() => choose(p.tier)} disabled={!!busy}
                  className={`rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60 ${featured ? "bg-pro text-pro-foreground" : "border hover:bg-accent"}`}>
                  {busy === p.tier ? "Switching…" : p.tier === "Free" ? "Downgrade to Free" : p.cta}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-12 overflow-hidden rounded-lg border">
        <div className="grid grid-cols-[1fr_6rem_6rem_6rem] border-b bg-card px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:grid-cols-[1fr_9rem_9rem_9rem]">
          <span>Feature</span><span className="text-center">Free</span><span className="text-center text-pro">Pro</span><span className="text-center">Enterprise</span>
        </div>
        {MATRIX.map(([f, a, b, c]) => (
          <div key={f} className="grid grid-cols-[1fr_6rem_6rem_6rem] items-center border-b px-4 py-3 text-sm last:border-0 sm:grid-cols-[1fr_9rem_9rem_9rem]">
            <span>{f}</span><Cell v={a} /><span className="text-center text-pro"><Cell v={b} /></span><Cell v={c} />
          </div>
        ))}
      </div>
    </main>
  );
}
