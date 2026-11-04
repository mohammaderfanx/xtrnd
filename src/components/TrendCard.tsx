import { Bookmark, BookmarkCheck, Eye, Heart, Repeat2, ArrowUpRight, Sparkles } from "lucide-react";
import { fmt, metricsOf, type Curator, type Item, type Velocity } from "@/lib/xtrnd";
import { Avatar, CuratorBadge, ScoreBadge, ShareMenu, VelocityBadge } from "./ItemBits";

type Props = { item: Item; saved: boolean; onToggle: () => void; velocity?: Velocity | undefined; curator?: Curator | undefined; onOpen?: (() => void) | undefined; onSimilar?: (() => void) | undefined };

export function TrendCard({ item, saved, onToggle, velocity = null, curator, onOpen, onSimilar }: Props) {
  const m = metricsOf(item);
  const social = item.type !== "Account" && item.type !== "Community";
  return (
    <article className="flex flex-col gap-4 bg-background p-5 transition-colors hover:bg-card">
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
        <span className="rounded-sm border px-1.5 py-0.5 text-foreground">{item.type}</span>
        <span className="truncate rounded-sm border px-1.5 py-0.5 text-muted-foreground">{item.category}</span>
        <span className="ml-auto"><ScoreBadge score={m.engagement_score} /></span>
      </div>
      <div className="flex items-center gap-3">
        <Avatar src={item.author_avatar} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-semibold">{item.author_name ?? item.author_handle}</div>
          <div className="truncate font-mono text-xs text-muted-foreground">{item.author_handle}</div>
        </div>
        <VelocityBadge v={velocity} />
      </div>
      <button onClick={onOpen} className="flex-1 text-left"><p className="line-clamp-5 min-h-[3lh] text-[15px] leading-relaxed text-foreground/90 hover:text-foreground">{item.title_or_snippet.slice(0, 280)}</p>
        <span className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] text-pro">⚡ AI Synthesis · open reader</span></button>
      <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{fmt(m.views)}</span>
        {social && <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{fmt(m.likes)}</span>}
        {social && <span className="flex items-center gap-1"><Repeat2 className="h-3.5 w-3.5" />{fmt(m.retweets)}</span>}
        <span className="ml-auto"><CuratorBadge curator={curator} /></span>
      </div>
      <div className="flex gap-2">
        <a href={item.external_url} target="_blank" rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
          View on X.com <ArrowUpRight className="h-4 w-4" />
        </a>
        {onSimilar && <button onClick={onSimilar} aria-label="Find similar" title="Find similar"
          className="rounded-md border px-3 text-muted-foreground transition-colors hover:bg-accent hover:text-pro"><Sparkles className="h-4 w-4" /></button>}
        <ShareMenu item={item} />
        <button onClick={onToggle} aria-label={saved ? "Remove bookmark" : "Bookmark"} aria-pressed={saved}
          className={`rounded-md border px-3 transition-colors hover:bg-accent ${saved ? "text-signal" : "text-muted-foreground"}`}>
          {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        </button>
      </div>
    </article>
  );
}

export function TerminalRow({ item, saved, onToggle, velocity = null, curator, rank, onOpen }: Props & { rank: number }) {
  const m = metricsOf(item);
  return (
    <div className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 border-b px-3 py-2 font-mono text-xs transition-colors last:border-b-0 hover:bg-card md:grid-cols-[2rem_9rem_1fr_6.5rem_4.5rem_4.5rem_4.5rem_3.5rem_auto]">
      <span className="text-muted-foreground tabular-nums">{String(rank).padStart(2, "0")}</span>
      <a href={item.external_url} target="_blank" rel="noopener noreferrer" className="hidden min-w-0 items-center gap-2 md:flex">
        <Avatar src={item.author_avatar} size={18} /><span className="truncate text-foreground">{item.author_handle}</span>
      </a>
      <button onClick={onOpen} className="min-w-0 truncate text-left font-sans text-[13px] text-foreground/90 hover:text-foreground">
        <span className="mr-2 text-muted-foreground">[{item.type}]</span>{item.title_or_snippet}
        {curator && <span className="ml-2 text-muted-foreground">· via {curator.handle}</span>}
      </button>
      <span className="hidden md:block"><VelocityBadge v={velocity} /></span>
      <span className="hidden text-right tabular-nums text-muted-foreground md:block">{fmt(m.views)}</span>
      <span className="hidden text-right tabular-nums text-muted-foreground md:block">{fmt(m.likes)}</span>
      <span className="hidden text-right tabular-nums text-muted-foreground md:block">{fmt(m.retweets)}</span>
      <span className="hidden text-right md:block"><ScoreBadge score={m.engagement_score} /></span>
      <button onClick={onToggle} aria-label={saved ? "Remove bookmark" : "Bookmark"} className={saved ? "text-signal" : "text-muted-foreground hover:text-foreground"}>
        {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      </button>
    </div>
  );
}
