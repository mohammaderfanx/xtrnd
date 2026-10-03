import { Bookmark, BookmarkCheck, Eye, Heart, Repeat2, Flame, ArrowUpRight } from "lucide-react";
import { fmt, type Item, type Metrics } from "@/lib/xtrnd";

export function TrendCard({ item, saved, onToggle }: { item: Item; saved: boolean; onToggle: () => void }) {
  const m = item.metrics as unknown as Metrics;
  return (
    <article className="flex flex-col gap-4 bg-background p-5 transition-colors hover:bg-card">
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
        <span className="rounded-sm border px-1.5 py-0.5 text-foreground">{item.type}</span>
        <span className="rounded-sm border px-1.5 py-0.5 text-muted-foreground">{item.category}</span>
        <span className="ml-auto flex items-center gap-1 text-hot">
          <Flame className="h-3.5 w-3.5" />{m.engagement_score}/100
        </span>
      </div>
      <div className="flex items-center gap-3">
        <img src={item.author_avatar ?? ""} alt="" loading="lazy" className="h-9 w-9 rounded-full border bg-muted object-cover" />
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold">{item.author_name ?? item.author_handle}</div>
          <div className="truncate font-mono text-xs text-muted-foreground">{item.author_handle}</div>
        </div>
      </div>
      <p className="line-clamp-5 flex-1 text-[15px] leading-relaxed text-foreground/90">{item.title_or_snippet.slice(0, 280)}</p>
      <div className="flex gap-4 font-mono text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{fmt(m.views)}</span>
        {item.type !== "Account" && item.type !== "Community" && (
          <>
            <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{fmt(m.likes)}</span>
            <span className="flex items-center gap-1"><Repeat2 className="h-3.5 w-3.5" />{fmt(m.retweets)}</span>
          </>
        )}
      </div>
      <div className="flex gap-2">
        <a href={item.external_url} target="_blank" rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
          View on X.com <ArrowUpRight className="h-4 w-4" />
        </a>
        <button onClick={onToggle} aria-label={saved ? "Remove bookmark" : "Bookmark"}
          className={`rounded-md border px-3 transition-colors hover:bg-accent ${saved ? "text-signal" : "text-muted-foreground"}`}>
          {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        </button>
      </div>
    </article>
  );
}
