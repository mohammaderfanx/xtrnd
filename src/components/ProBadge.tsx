import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";

export function ProBadge({ label = "PRO" }: { label?: string }) {
  return <span className="rounded-sm border border-pro/40 bg-pro/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-pro">{label}</span>;
}

export function ProGate({ title, body }: { title: string; body: string }) {
  return (
    <div className="glass rounded-lg p-8 text-center">
      <Lock className="mx-auto h-6 w-6 text-pro" />
      <h2 className="mt-3 text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{body}</p>
      <Link to="/pricing" className="mt-5 inline-block rounded-md bg-pro px-4 py-2 text-sm font-semibold text-pro-foreground hover:opacity-90">See Pro plans</Link>
    </div>
  );
}
