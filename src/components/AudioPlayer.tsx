import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Headphones, Loader2, Pause, Play, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { getDailyBrief, generateDailyBrief } from "@/lib/intel.functions";
import { useSession } from "@/lib/xtrnd";

const t = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function AudioPlayer() {
  const { session } = useSession();
  const qc = useQueryClient();
  const gen = useServerFn(generateDailyBrief);
  const { data } = useQuery({ queryKey: ["daily-brief"], queryFn: () => getDailyBrief(), staleTime: 30 * 60e3 });
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [showScript, setShowScript] = useState(false);
  useEffect(() => { if (localStorage.getItem("xtrnd-player-hidden") === "1") setHidden(true); }, []);

  if (hidden) {
    return (
      <button onClick={() => { setHidden(false); localStorage.removeItem("xtrnd-player-hidden"); }} aria-label="Open audio brief"
        className="fixed bottom-4 left-4 z-40 grid h-10 w-10 place-items-center rounded-full border bg-card text-signal shadow-lg"><Headphones className="h-4 w-4" /></button>
    );
  }
  const brief = data?.brief;
  const generate = async () => {
    if (!session) return toast("Sign in to generate today's brief");
    setBusy(true);
    const r = await gen();
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    await qc.invalidateQueries({ queryKey: ["daily-brief"] });
    toast.success("Today's audio brief is ready");
  };
  const toggle = () => { const a = audio.current; if (!a) return; if (a.paused) void a.play(); else a.pause(); };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur">
      {showScript && brief && <p className="mx-auto max-h-40 max-w-6xl overflow-y-auto px-4 pt-3 font-serif text-sm leading-relaxed text-muted-foreground">{brief.script}</p>}
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Headphones className="h-4 w-4 shrink-0 text-signal" />
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-medium">Daily Signal Audio Brief</div>
          <div className="truncate font-mono text-[11px] text-muted-foreground">{brief ? `${brief.day}${data?.isToday ? " · today" : " · latest"} · top 5 signals` : "Not generated yet"}</div>
        </div>
        {brief?.url ? (
          <>
            <audio ref={audio} src={brief.url} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
              onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDur(e.currentTarget.duration)} />
            <button onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <input type="range" min={0} max={dur || 0} step={0.5} value={pos} aria-label="Seek"
              onChange={(e) => { if (audio.current) audio.current.currentTime = Number(e.target.value); }} className="hidden flex-1 accent-[var(--color-signal)] sm:block" />
            <span className="hidden font-mono text-[11px] tabular-nums text-muted-foreground sm:block">{t(pos)} / {t(dur)}</span>
          </>
        ) : <span className="flex-1" />}
        {!data?.isToday && (
          <button onClick={generate} disabled={busy} className="ml-auto flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-60">
            {busy ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generating (~1 min)</> : "Generate today's"}
          </button>
        )}
        {brief && <button onClick={() => setShowScript((s) => !s)} aria-label="Show transcript" className="text-muted-foreground hover:text-foreground"><FileText className="h-4 w-4" /></button>}
        <button onClick={() => { audio.current?.pause(); setHidden(true); localStorage.setItem("xtrnd-player-hidden", "1"); }} aria-label="Hide player" className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
