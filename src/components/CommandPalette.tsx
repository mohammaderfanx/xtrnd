import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Bookmark, Trophy, Home, ArrowUpRight, Hash } from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut,
} from "@/components/ui/command";
import { CATEGORIES, itemsQuery } from "@/lib/xtrnd";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data = [] } = useQuery(itemsQuery);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); return; }
      if (typing || !e.shiftKey || e.metaKey || e.ctrlKey) return;
      if (e.key === "S") { e.preventDefault(); navigate({ to: "/submit" }); }
      if (e.key === "B") { e.preventDefault(); navigate({ to: "/bookmarks" }); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  const authors = useMemo(() => {
    const seen = new Map<string, (typeof data)[number]>();
    data.forEach((i) => { if (!seen.has(i.author_handle)) seen.set(i.author_handle, i); });
    return [...seen.values()];
  }, [data]);

  const go = (fn: () => void) => { setOpen(false); fn(); };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Jump to an author, category, or action…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go(() => navigate({ to: "/submit" }))}><Plus />Submit link<CommandShortcut>⇧S</CommandShortcut></CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/bookmarks" }))}><Bookmark />Saved<CommandShortcut>⇧B</CommandShortcut></CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/curators" }))}><Trophy />Curator leaderboard</CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/" }))}><Home />Home</CommandItem>
        </CommandGroup>
        <CommandGroup heading="Categories">
          {CATEGORIES.map((c) => (
            <CommandItem key={c} onSelect={() => go(() => window.dispatchEvent(new CustomEvent("xtrnd:category", { detail: c })))}>
              <Hash />{c}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Authors">
          {authors.map((i) => (
            <CommandItem key={i.author_handle} value={`${i.author_name} ${i.author_handle}`}
              onSelect={() => go(() => window.open(i.external_url, "_blank", "noopener,noreferrer"))}>
              <ArrowUpRight />{i.author_name ?? i.author_handle}<span className="ml-2 font-mono text-xs text-muted-foreground">{i.author_handle}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
