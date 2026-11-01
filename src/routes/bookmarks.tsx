import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendCard } from "@/components/TrendCard";
import { useBookmarks } from "@/lib/bookmarks";
import { itemsQuery } from "@/lib/xtrnd";

export const Route = createFileRoute("/bookmarks")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Saved — Xtrnd" },
      { name: "description", content: "Your bookmarked X posts, threads and accounts on Xtrnd." },
      { property: "og:title", content: "Saved — Xtrnd" },
      { property: "og:description", content: "Your bookmarked X posts, threads and accounts on Xtrnd." },
    ],
  }),
  component: Bookmarks,
});

function Bookmarks() {
  const { data = [] } = useQuery(itemsQuery);
  const { ids, toggle, session } = useBookmarks();
  const saved = data.filter((i) => ids.has(i.id));
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Saved</h1>
      <p className="mt-1 font-mono text-xs text-muted-foreground">{saved.length} items</p>
      <div className="mt-6">
        {!session ? (
          <div className="rounded-lg border p-12 text-center text-sm text-muted-foreground">
            <Link to="/auth" className="text-signal underline-offset-4 hover:underline">Sign in</Link> to see your saved items.
          </div>
        ) : saved.length === 0 ? (
          <p className="rounded-lg border p-12 text-center text-sm text-muted-foreground">Nothing saved yet. Tap the bookmark icon on any card.</p>
        ) : (
          <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((i) => <TrendCard key={i.id} item={i} saved onToggle={() => toggle(i.id)} />)}
          </div>
        )}
      </div>
    </main>
  );
}
