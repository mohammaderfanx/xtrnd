import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { unfurlX, type Unfurled } from "@/lib/unfurl.functions";
import { dispatchFeeds } from "@/lib/pro.functions";
import { Avatar } from "@/components/ItemBits";
import { CATEGORIES, TYPES, detectType, fmt, useSession, type Category, type Item, type ItemType } from "@/lib/xtrnd";

export const Route = createFileRoute("/submit")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Submit a link — Xtrnd" },
      { name: "description", content: "Add a high-value X post, thread or account to Xtrnd." },
      { property: "og:title", content: "Submit a link — Xtrnd" },
      { property: "og:description", content: "Add a high-value X post, thread or account to Xtrnd." },
    ],
  }),
  component: Submit,
});

// 0-100 display score from raw engagement (log-scaled).
const toScore = (m: { likes: number; retweets: number; views: number }) =>
  Math.max(40, Math.min(99, Math.round(20 * Math.log10(1 + m.likes + m.retweets * 2.5 + m.views * 0.01))));

function Submit() {
  const { session, ready } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const unfurl = useServerFn(unfurlX);
  const dispatch = useServerFn(dispatchFeeds);
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<Category>("AI & Tech");
  const [type, setType] = useState<ItemType | "auto">("auto");
  const [note, setNote] = useState("");
  const [meta, setMeta] = useState<Unfurled | null>(null);
  const [looking, setLooking] = useState(false);
  const requestVersion = useRef(0);

  useEffect(() => {
    const u = url.trim();
    const version = ++requestVersion.current;
    setMeta(null);
    setNote("");
    setType("auto");
    setLooking(false);
    if (!/^https?:\/\/(www\.)?(x|twitter)\.com\/\S+/.test(u)) return;
    setLooking(true);
    const t = setTimeout(async () => {
      try {
        const r = await unfurl({ data: { url: u } });
        if (version !== requestVersion.current) return;
        if (r.ok) { setMeta(r.item); setNote(r.item.text); setType(r.item.type); }
        else { setMeta(null); toast.message(r.error); }
      } catch {
        if (version === requestVersion.current) toast.error("Couldn't read this link. You can enter its details manually.");
      } finally { if (version === requestVersion.current) setLooking(false); }
    }, 350);
    return () => { clearTimeout(t); requestVersion.current++; };
  }, [url, unfurl]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || !session || looking) return;
    let u: URL;
    try { u = new URL(url); } catch { toast.error("Enter a valid URL"); return; }
    if (!/(^|\.)(x|twitter)\.com$/.test(u.hostname)) { toast.error("Only x.com or twitter.com links"); return; }
    const handle = meta?.author_handle ?? "@" + (u.pathname.split("/").filter(Boolean)[0] ?? "unknown");
    const m = meta?.metrics ?? { likes: 0, retweets: 0, views: 0 };
    const row = {
      id: crypto.randomUUID(),
      external_url: meta?.url ?? u.toString(), category, type: type === "auto" ? detectType(url) : type,
      author_handle: handle, author_name: meta?.author_name ?? handle.slice(1),
      author_avatar: meta?.author_avatar ?? `https://unavatar.io/x/${handle.slice(1)}`,
      title_or_snippet: note.trim() || `Submitted from ${handle}`,
      metrics: { ...m, engagement_score: toScore(m) },
      submitted_by: session.user.id,
    };
    // Optimistic: show it in the feed immediately, roll back on failure.
    const prev = qc.getQueryData<Item[]>(["items"]);
    qc.setQueryData<Item[]>(["items"], (old = []) => [{ ...row, created_at: new Date().toISOString(), rank_score: 1e9 } as Item, ...old]);
    navigate({ to: "/" });
    toast.success("Indexed. It's live on Xtrnd.");
    supabase.from("trending_items").insert(row).then(({ error }) => {
      if (error) { qc.setQueryData(["items"], prev); toast.error(`Submission failed: ${error.message}`); }
      else dispatch({ data: { itemId: row.id } }).catch(() => {});
      qc.invalidateQueries({ queryKey: ["items"] });
      qc.invalidateQueries({ queryKey: ["history"] });
      qc.invalidateQueries({ queryKey: ["curators"] });
    });
  };

  const field = "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-ring";
  return (
    <main className="grid min-h-[calc(100vh-3.5rem)] place-items-center bg-background/60 px-4 py-10">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Submit to Xtrnd</h1>
          <Link to="/" aria-label="Close" className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></Link>
        </div>
        {!ready ? <Loader2 aria-label="Loading account" className="mt-6 h-5 w-5 animate-spin text-muted-foreground" /> : !session ? (
          <p className="mt-6 text-sm text-muted-foreground">
            <Link to="/auth" className="text-signal hover:underline">Sign in</Link> to submit links.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block space-y-1.5"><span className="text-xs text-muted-foreground">X.com URL</span>
              <div className="relative">
                <input required autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://x.com/user/status/…" className={`${field} pr-9`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {looking ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : meta ? <CheckCircle2 className="h-4 w-4 text-signal" /> : null}
                </span>
              </div>
            </label>
            <div className="flex h-[52px] items-center gap-3 rounded-md border bg-background px-3">
              {meta ? (
                <>
                  <Avatar src={meta.author_avatar} size={30} />
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="truncate text-sm font-medium">{meta.author_name}</div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground">{meta.author_handle}</div>
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">{fmt(meta.metrics.views)} · {fmt(meta.metrics.likes)}♥</span>
                </>
              ) : (
                <span className="font-mono text-xs text-muted-foreground">{looking ? "Reading post…" : "Paste a link to auto-fill details"}</span>
              )}
            </div>
            <label className="block space-y-1.5"><span className="text-xs text-muted-foreground">Key takeaway</span>
              <textarea value={note} maxLength={280} onChange={(e) => setNote(e.target.value)} rows={3}
                className="w-full rounded-md border bg-background p-3 text-sm outline-none focus:border-ring" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5"><span className="text-xs text-muted-foreground">Category</span>
                <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className={field}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
              <label className="space-y-1.5"><span className="text-xs text-muted-foreground">Type</span>
                <select value={type} onChange={(e) => setType(e.target.value as ItemType | "auto")} className={field}>
                  <option value="auto">Auto ({url ? detectType(url) : "detect"})</option>
                  {TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
            </div>
            <button disabled={looking} className="h-10 w-full rounded-md bg-signal text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
              Publish to Xtrnd
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
