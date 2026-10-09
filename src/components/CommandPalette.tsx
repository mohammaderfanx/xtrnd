import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Bookmark, Trophy, Home, ArrowUpRight, Hash, Filter, Rows3, Sparkles, Radio, Newspaper, KeyRound } from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut,
} from "@/components/ui/command";
import { CATEGORIES, TYPES, itemsQuery } from "@/lib/xtrnd";

const CAT_ALIASES: Record<string, string> = { ai: "AI & Tech", tech: "AI & Tech", saas: "SaaS & Startups", startups: "SaaS & Startups", design: "Design & UX", ux: "Design & UX", finance: "Finance", crypto: "Crypto" };
function parseCommand(q: string) {
  const out: { type?: string; category?: string; q?: string } = {};
  const rest: string[] = [];
  for (const tok of q.trim().split(/\s+/)) {
    const m = tok.match(/^\/(type|cat):(\S+)$/i);
    if (!m) { rest.push(tok); continue; }
    const v = m[2]!.toLowerCase();
    if (m[1]!.toLowerCase() === "type") out.type = TYPES.find((t) => t.toLowerCase().startsWith(v.replace(/s$/, "")));
    else out.category = CAT_ALIASES[v] ?? CATEGORIES.find((c) => c.toLowerCase().startsWith(v));
  }
  if (rest.join(" ").trim()) out.q = rest.join(" ").trim();
  return out;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const cmd = search.includes("/") ? parseCommand(search) : null;
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
      if (e.key === "T") { e.preventDefault(); window.dispatchEvent(new CustomEvent("xtrnd:toggle-view")); }
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
    <CommandDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }}>
      <CommandInput value={search} onValueChange={setSearch} placeholder="Search, or filter: /type:thread /cat:ai …" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        {cmd && (cmd.type || cmd.category) && (
          <CommandGroup heading="Apply filter" forceMount>
            <CommandItem forceMount value={`apply ${search}`} onSelect={() => go(() => { navigate({ to: "/" }); setTimeout(() => window.dispatchEvent(new CustomEvent("xtrnd:filter", { detail: cmd })), 50); })}>
              <Filter />Show {cmd.type ?? "all types"} · {cmd.category ?? "all topics"}{cmd.q ? ` · "${cmd.q}"` : ""}
            </CommandItem>
          </CommandGroup>
        )}
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go(() => navigate({ to: "/submit" }))}><Plus />Submit link<CommandShortcut>⇧S</CommandShortcut></CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/bookmarks" }))}><Bookmark />Saved<CommandShortcut>⇧B</CommandShortcut></CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/curators" }))}><Trophy />Curator leaderboard</CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/" }))}><Home />Home</CommandItem>
          <CommandItem onSelect={() => go(() => window.dispatchEvent(new CustomEvent("xtrnd:toggle-view")))}><Rows3 />Toggle compact list<CommandShortcut>⇧T</CommandShortcut></CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/feeds" }))}><Radio />Signal Feeds</CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/digest" }))}><Newspaper />Signal Digest</CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/developers" }))}><KeyRound />Developer API</CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/pricing" }))}><Sparkles />Pricing / Pro</CommandItem>
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
