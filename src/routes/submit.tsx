import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, TYPES, detectType, useSession, type Category, type ItemType } from "@/lib/xtrnd";

export const Route = createFileRoute("/submit")({
  head: () => ({
    meta: [
      { title: "Submit a link — Xtrnd" },
      { name: "description", content: "Add a high-value X post, thread or account to Xtrnd." },
      { property: "og:title", content: "Submit a link — Xtrnd" },
      { property: "og:description", content: "Add a high-value X post, thread or account to Xtrnd." },
    ],
  }),
  component: Submit,
});

function Submit() {
  const { session, ready } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<Category>("AI & Tech");
  const [type, setType] = useState<ItemType | "auto">("auto");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    let u: URL;
    try { u = new URL(url); } catch { return toast.error("Enter a valid URL"); }
    if (!/(^|\.)(x|twitter)\.com$/.test(u.hostname)) { toast.error("Only x.com or twitter.com links"); return; }
    const handle = "@" + (u.pathname.split("/").filter(Boolean)[0] ?? "unknown");
    setBusy(true);
    const { error } = await supabase.from("trending_items").insert({
      external_url: u.toString(), category, type: type === "auto" ? detectType(url) : type,
      author_handle: handle, author_name: handle.slice(1),
      author_avatar: `https://unavatar.io/x/${handle.slice(1)}`,
      title_or_snippet: note.trim() || `Submitted from ${handle}`,
      submitted_by: session!.user.id,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Indexed. It's live on Xtrnd.");
    qc.invalidateQueries({ queryKey: ["items"] });
    navigate({ to: "/" });
  };

  const field = "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-ring";
  return (
    <main className="grid min-h-[calc(100vh-3.5rem)] place-items-center bg-background/60 px-4 py-10">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Submit to Xtrnd</h1>
          <Link to="/" aria-label="Close" className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></Link>
        </div>
        {ready && !session ? (
          <p className="mt-6 text-sm text-muted-foreground">
            <Link to="/auth" className="text-signal hover:underline">Sign in</Link> to submit links.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block space-y-1.5"><span className="text-xs text-muted-foreground">X.com URL</span>
              <input required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://x.com/user/status/…" className={field} /></label>
            <label className="block space-y-1.5"><span className="text-xs text-muted-foreground">Key takeaway (optional)</span>
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
            <button disabled={busy} className="h-10 w-full rounded-md bg-signal text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {busy ? "Indexing…" : "Submit for indexation"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
