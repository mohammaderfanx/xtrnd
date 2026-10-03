import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, Bookmark, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/xtrnd";

export function Header() {
  const { session } = useSession();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-6 w-6 place-items-center rounded-sm bg-signal font-mono text-xs font-bold text-primary-foreground">X</span>
          Xtrnd
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm">
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
