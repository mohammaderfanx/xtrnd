import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, Bookmark, LogOut, Trophy } from "lucide-react";
import { usePlan } from "@/lib/plan";
import { ProBadge } from "./ProBadge";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/xtrnd";

export function Header() {
  const { session } = useSession();
  const { isPro, tier } = usePlan();
  const nav = "hidden rounded-md px-2.5 py-1.5 text-muted-foreground hover:text-foreground lg:block";
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-6 w-6 place-items-center rounded-sm bg-signal font-mono text-xs font-bold text-primary-foreground">X</span>
          Xtrnd
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm">
          <Link to="/feeds" className={nav} activeProps={{ className: "text-foreground" }}>Feeds</Link>
          <Link to="/digest" className={nav} activeProps={{ className: "text-foreground" }}>Digest</Link>
          <Link to="/developers" className={nav} activeProps={{ className: "text-foreground" }}>API</Link>
          <Link to="/pricing" className="rounded-md px-2.5 py-1.5 text-muted-foreground hover:text-foreground">{isPro ? <ProBadge label={tier.toUpperCase()} /> : <span className="text-pro">Go Pro</span>}</Link>
          <Link to="/curators" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground"
            activeProps={{ className: "text-foreground" }}>
            <Trophy className="h-4 w-4" /><span className="hidden sm:inline">Curators</span>
          </Link>
          <Link to="/bookmarks" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground"
            activeProps={{ className: "text-foreground" }}>
            <Bookmark className="h-4 w-4" /><span className="hidden sm:inline">Saved</span>
          </Link>
          {session ? (
            <button onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}
              className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          ) : (
            <Link to="/auth" className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground">Sign in</Link>
          )}
          <Link to="/submit" className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" /><span className="hidden sm:inline">Submit Link/Account</span><span className="sm:hidden">Submit</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
