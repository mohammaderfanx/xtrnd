import { useState } from "react";
import { Share2, Link2, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { fmt, metricsOf, type Curator, type Item, type Velocity } from "@/lib/xtrnd";

export function Avatar({ src, size = 36 }: { src: string | null; size?: number }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <span className="relative shrink-0 overflow-hidden rounded-full border bg-muted" style={{ width: size, height: size }}>
      {!loaded && <span className="absolute inset-0 animate-pulse bg-muted" />}
      {src && <img src={src} alt="" loading="lazy" width={size} height={size} onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`} />}
    </span>
  );
}

const V: Record<Exclude<Velocity, null>, { label: string; cls: string }> = {
  Viral: { label: "🔥 Viral", cls: "border-hot/40 bg-hot/10 text-hot" },
  Rising: { label: "⚡ Rising", cls: "border-rising/40 bg-rising/10 text-rising" },
  Evergreen: { label: "💎 Evergreen", cls: "border-signal/40 bg-signal/10 text-signal" },
};
export function VelocityBadge({ v }: { v: Velocity }) {
  if (!v) return null;
  return <span className={`whitespace-nowrap rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${V[v].cls}`}>{V[v].label}</span>;
}

export function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 90 ? "text-signal" : score >= 80 ? "text-rising" : "text-muted-foreground";
  return <span className={`font-mono text-xs font-semibold tabular-nums ${cls}`}>{score}/100</span>;
}

export function CuratorBadge({ curator }: { curator?: Curator }) {
  if (!curator) return null;
  return (
    <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground" title="Curated on Xtrnd">
      <span className="grid h-4 w-4 place-items-center rounded-full bg-accent text-[9px] uppercase text-foreground">{curator.handle[0]}</span>
      via {curator.handle}{curator.is_verified_curator && <span className="text-signal">✓</span>}
    </span>
  );
}

function shareCard(item: Item) {
  const c = document.createElement("canvas");
  c.width = 1200; c.height = 630;
  const g = c.getContext("2d")!;
  const css = getComputedStyle(document.documentElement);
  const col = (v: string) => css.getPropertyValue(v).trim();
  g.fillStyle = col("--background"); g.fillRect(0, 0, 1200, 630);
  g.strokeStyle = col("--border"); g.lineWidth = 2; g.strokeRect(40, 40, 1120, 550);
  g.fillStyle = col("--signal"); g.font = "600 28px monospace"; g.fillText(`XTRND · ${item.type.toUpperCase()} · ${item.category}`, 80, 110);
  g.fillStyle = col("--foreground"); g.font = "600 44px sans-serif";
  const words = item.title_or_snippet.split(" "); let line = "", y = 200;
  for (const w of words) {
    if (g.measureText(line + w).width > 1040) { g.fillText(line, 80, y); line = ""; y += 58; if (y > 460) { line = "…"; break; } }
    line += w + " ";
  }
  g.fillText(line, 80, y);
  const m = metricsOf(item);
  g.fillStyle = col("--muted-foreground"); g.font = "28px monospace";
  g.fillText(`${item.author_handle}   ${fmt(m.views)} views   ${fmt(m.likes)} likes`, 80, 550);
  const a = document.createElement("a");
  a.download = `xtrnd-${item.author_handle.slice(1)}.png`; a.href = c.toDataURL("image/png"); a.click();
}

export function ShareMenu({ item }: { item: Item }) {
  const copy = async (text: string, msg: string) => { await navigator.clipboard.writeText(text); toast.success(msg); };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Share" className="rounded-md border px-3 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
        <Share2 className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => copy(item.external_url, "Link copied")}><Link2 className="h-4 w-4" />Copy direct link</DropdownMenuItem>
        <DropdownMenuItem onClick={() => copy(`> ${item.title_or_snippet}\n>\n> — [${item.author_handle}](${item.external_url}) via Xtrnd`, "Markdown copied")}>
          <FileText className="h-4 w-4" />Copy markdown snippet</DropdownMenuItem>
        <DropdownMenuItem onClick={() => shareCard(item)}><ImageIcon className="h-4 w-4" />Download share card</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
