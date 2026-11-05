import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Users, MessageSquare, Tag, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { itemsQuery } from "@/lib/xtrnd";
import { setActiveWorkspace, useWorkspaces } from "@/lib/workspace";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/workspace")({
  head: () => ({
    meta: [
      { title: "Team Workspace — Xtrnd" },
      { name: "description", content: "Shared research boards with comments, tags and live presence for teams tracking X.com signals." },
      { property: "og:title", content: "Team Workspace — Xtrnd" },
      { property: "og:description", content: "Collaborate on X.com signal research with your team in real time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WorkspacePage,
});

type Presence = { user: string; typing: string | null };

function WorkspacePage() {
  const { session, workspaces, current, refetch } = useWorkspaces();
  const qc = useQueryClient();
  const { data: items = [] } = useQuery(itemsQuery);
  const [newName, setNewName] = useState("");
  const [invite, setInvite] = useState({ email: "", role: "editor" as "editor" | "viewer" });
  const [draft, setDraft] = useState({ itemId: "", text: "", tags: "" });
  const [online, setOnline] = useState<Presence[]>([]);
  const chan = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const me = session?.user.email ?? "me";
  const wsId = current?.id;

  const { data: members = [] } = useQuery({ queryKey: ["ws-members", wsId], enabled: !!wsId,
    queryFn: async () => (await supabase.from("workspace_members").select("*").eq("workspace_id", wsId!)).data ?? [] });
  const { data: notes = [] } = useQuery({ queryKey: ["ws-notes", wsId], enabled: !!wsId,
    queryFn: async () => (await supabase.from("item_annotations").select("*").eq("workspace_id", wsId!).order("created_at", { ascending: false }).limit(300)).data ?? [] });

  useEffect(() => {
    if (!wsId || !session) return;
    const ch = supabase.channel(`ws:${wsId}`, { config: { presence: { key: session.user.id } } });
    ch.on("postgres_changes", { event: "*", schema: "public", table: "item_annotations", filter: `workspace_id=eq.${wsId}` }, () => qc.invalidateQueries({ queryKey: ["ws-notes", wsId] }))
      .on("presence", { event: "sync" }, () => setOnline(Object.values(ch.presenceState<Presence>()).map((v) => v[0]!).filter(Boolean)))
      .subscribe(async (st) => { if (st === "SUBSCRIBED") await ch.track({ user: me, typing: null }); });
    chan.current = ch;
    return () => { supabase.removeChannel(ch); chan.current = null; };
  }, [wsId, session, me, qc]);

  const board = useMemo(() => {
    const g = new Map<string, typeof notes>();
    for (const n of notes) g.set(n.item_id, [...(g.get(n.item_id) ?? []), n]);
    return [...g.entries()];
  }, [notes]);
  const role = current?.role;
  const canWrite = role === "owner" || role === "editor";

  if (!session) return <main className="mx-auto max-w-3xl px-4 py-16 text-center"><Users className="mx-auto h-8 w-8 text-signal" /><h1 className="mt-4 text-2xl font-semibold">Team Workspaces</h1>
    <p className="mt-2 text-sm text-muted-foreground">Sign in to research with your team.</p><Link to="/auth" className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Sign in</Link></main>;

  const create = async () => {
    if (!newName.trim()) return;
    const { data, error } = await supabase.from("workspaces").insert({ name: newName.trim(), owner_id: session.user.id }).select("id").single();
    if (error) return void toast.error(error.message);
    setNewName(""); await refetch(); setActiveWorkspace(data.id); toast.success("Workspace created");
  };
  const doInvite = async () => {
    const { data, error } = await supabase.rpc("invite_workspace_member", { p_ws: wsId!, p_email: invite.email, p_role: invite.role });
    if (error) return void toast.error(error.message);
    if (!data) return void toast.error("No Xtrnd account with that email yet — ask them to sign up first.");
    setInvite({ ...invite, email: "" }); qc.invalidateQueries({ queryKey: ["ws-members", wsId] }); toast.success("Member added");
  };
  const typing = (label: string | null) => {
    void chan.current?.track({ user: me, typing: label });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (label) typingTimer.current = setTimeout(() => void chan.current?.track({ user: me, typing: null }), 3000);
  };
  const post = async (itemId: string, text: string, tags: string) => {
    const t = tags.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean).slice(0, 8);
    if (!text.trim() && !t.length) return;
    const { error } = await supabase.from("item_annotations").insert({ workspace_id: wsId!, item_id: itemId, author_id: session.user.id, comment_text: text.trim().slice(0, 2000), tags: t });
    if (error) return void toast.error(error.message.includes("row-level") ? "Viewers can't comment." : error.message);
    typing(null); qc.invalidateQueries({ queryKey: ["ws-notes", wsId] });
  };
  const emailOf = (uid: string) => members.find((m) => m.user_id === uid)?.email ?? "teammate";
  const input = "h-9 rounded-md border bg-card px-3 text-sm outline-none focus:border-ring";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <p className="font-mono text-xs uppercase tracking-widest text-signal">● Collaboration</p>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{current ? current.name : "Personal workspace"}</h1>
        {current && <span className="rounded-sm border px-1.5 py-0.5 font-mono text-[11px] uppercase text-muted-foreground">{role}</span>}
        <div className="ml-auto flex gap-2">
          <input className={input} placeholder="New team workspace" value={newName} maxLength={60} onChange={(e) => setNewName(e.target.value)} />
          <Button onClick={create}>Create</Button>
        </div>
      </div>

      {!current ? (
        <div className="mt-8 rounded-lg border p-8 text-sm text-muted-foreground">
          <p>You're in your personal space — your saved items live under <Link to="/bookmarks" className="text-foreground underline">Saved</Link>.</p>
          {workspaces.length ? <div className="mt-4 flex flex-wrap gap-2">{workspaces.map((w) => <button key={w.id} onClick={() => setActiveWorkspace(w.id)} className="rounded-md border px-3 py-1.5 text-foreground hover:bg-accent">{w.name}</button>)}</div>
            : <p className="mt-2">Create a team workspace to share a research board, comment threads and tags.</p>}
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_17rem]">
          <section>
            {canWrite && (
              <div className="rounded-lg border p-4">
                <h2 className="text-sm font-semibold">Add to board</h2>
                <div className="mt-3 flex flex-col gap-2 md:flex-row">
                  <select className={`${input} md:w-64`} value={draft.itemId} onChange={(e) => setDraft({ ...draft, itemId: e.target.value })}>
                    <option value="">Pick a signal…</option>
                    {items.map((i) => <option key={i.id} value={i.id}>{i.author_handle} — {i.title_or_snippet.slice(0, 50)}</option>)}
                  </select>
                  <input className={`${input} flex-1`} placeholder="Note for the team" value={draft.text} onChange={(e) => { setDraft({ ...draft, text: e.target.value }); typing("the board"); }} />
                  <input className={`${input} md:w-40`} placeholder="tags, comma sep" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
                  <Button disabled={!draft.itemId} onClick={async () => { await post(draft.itemId, draft.text, draft.tags); setDraft({ itemId: "", text: "", tags: "" }); }}>Add</Button>
                </div>
              </div>
            )}
            <div className="mt-4 space-y-3">
              {!board.length && <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">The shared board is empty.</p>}
              {board.map(([itemId, thread]) => {
                const it = items.find((i) => i.id === itemId);
                const tags = [...new Set(thread.flatMap((n) => n.tags))];
                const typers = online.filter((o) => o.user !== me && o.typing === itemId);
                return (
                  <article key={itemId} className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground"><span className="text-foreground">{it?.author_handle}</span>· {it?.category}
                      {it && <a href={it.external_url} target="_blank" rel="noopener noreferrer" className="ml-auto hover:text-foreground">open on X ↗</a>}</div>
                    <p className="mt-1 line-clamp-3 text-sm">{it?.title_or_snippet}</p>
                    {!!tags.length && <div className="mt-2 flex flex-wrap gap-1">{tags.map((t) => <span key={t} className="flex items-center gap-1 rounded-sm bg-accent px-1.5 py-0.5 font-mono text-[11px]"><Tag className="h-3 w-3" />{t}</span>)}</div>}
                    <ul className="mt-3 space-y-2 border-l pl-3">
                      {[...thread].reverse().filter((n) => n.comment_text).map((n) => (
                        <li key={n.id} className="group text-sm"><span className="font-mono text-xs text-signal">{emailOf(n.author_id).split("@")[0]}</span>
                          <span className="ml-2 font-mono text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
                          {(n.author_id === session.user.id || role === "owner") && <button onClick={async () => { await supabase.from("item_annotations").delete().eq("id", n.id); qc.invalidateQueries({ queryKey: ["ws-notes", wsId] }); }} aria-label="Delete comment" className="ml-2 hidden text-muted-foreground hover:text-destructive group-hover:inline"><Trash2 className="inline h-3 w-3" /></button>}
                          <p>{n.comment_text}</p></li>
                      ))}
                    </ul>
                    {typers.length > 0 && <p className="mt-2 font-mono text-[11px] text-muted-foreground">{typers.map((t) => t.user.split("@")[0]).join(", ")} typing…</p>}
                    {canWrite && <ThreadReply onTyping={() => typing(itemId)} onSend={(t) => post(itemId, t, "")} />}
                  </article>
                );
              })}
            </div>
          </section>
          <aside className="space-y-4">
            <div className="rounded-lg border p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold"><span className="h-2 w-2 animate-pulse rounded-full bg-signal" />Online now</h2>
              <ul className="mt-2 space-y-1 font-mono text-xs">{online.map((o) => <li key={o.user}>{o.user.split("@")[0]}{o.typing && <span className="text-muted-foreground"> · typing</span>}</li>)}</ul>
            </div>
            <div className="rounded-lg border p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4" />Members</h2>
              <ul className="mt-2 space-y-1 text-xs">{members.map((m) => <li key={m.user_id} className="flex justify-between gap-2"><span className="truncate">{m.email}</span><span className="font-mono text-muted-foreground">{m.role}</span></li>)}</ul>
              {role === "owner" && (
                <div className="mt-3 space-y-2">
                  <input className={`${input} w-full`} type="email" placeholder="teammate@company.com" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
                  <div className="flex gap-2">
                    <select className={`${input} flex-1`} value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as "editor" | "viewer" })}><option value="editor">Editor</option><option value="viewer">Viewer</option></select>
                    <Button size="sm" onClick={doInvite} disabled={!invite.email}>Invite</Button>
                  </div>
                </div>
              )}
            </div>
            <div className="rounded-lg border p-4 text-xs text-muted-foreground"><MessageSquare className="mb-1 h-4 w-4" />Only members of this workspace can see its board, comments and tags.</div>
          </aside>
        </div>
      )}
    </main>
  );
}

function ThreadReply({ onSend, onTyping }: { onSend: (t: string) => Promise<void>; onTyping: () => void }) {
  const [t, setT] = useState("");
  return (
    <form className="mt-3 flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (!t.trim()) return; await onSend(t); setT(""); }}>
      <input className="h-8 flex-1 rounded-md border bg-card px-3 text-sm outline-none focus:border-ring" placeholder="Reply…" value={t} onChange={(e) => { setT(e.target.value); onTyping(); }} />
      <button aria-label="Send" className="rounded-md border px-2 text-muted-foreground hover:text-foreground"><Send className="h-4 w-4" /></button>
    </form>
  );
}
