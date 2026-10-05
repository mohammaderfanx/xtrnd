import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Unfurled = {
  type: "Post" | "Account" | "Thread" | "Media" | "Community";
  text: string;
  author_name: string;
  author_handle: string;
  author_avatar: string | null;
  media: string[];
  metrics: { likes: number; retweets: number; views: number };
  url: string;
};

// Public, keyless X.com mirror API used to read tweet / profile metadata.
const API = "https://api.fxtwitter.com";

export const unfurlX = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ url: z.string().url().max(500) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: true; item: Unfurled } | { ok: false; error: string }> => {
    let u: URL;
    try { u = new URL(data.url); } catch { return { ok: false, error: "Invalid URL" }; }
    if (!/(^|\.)(x|twitter)\.com$/.test(u.hostname)) return { ok: false, error: "Only x.com links" };
    const parts = u.pathname.split("/").filter(Boolean);
    const clean = `https://x.com/${parts.join("/")}`;
    try {
      if (parts.includes("communities")) {
        return { ok: true, item: { type: "Community", text: "", author_name: "X Community", author_handle: "@community", author_avatar: null, media: [], metrics: { likes: 0, retweets: 0, views: 0 }, url: clean } };
      }
      const statusIdx = parts.indexOf("status");
      if (statusIdx > 0 && parts[statusIdx + 1]) {
        const r = await fetch(`${API}/${parts[0]}/status/${parts[statusIdx + 1]}`, { headers: { "user-agent": "Xtrnd/1.0" } });
        if (!r.ok) return { ok: false, error: "Couldn't read that post" };
        const j = (await r.json()) as { tweet?: any };
        const t = j.tweet;
        if (!t) return { ok: false, error: "Post not found" };
        const media: string[] = [...(t.media?.photos ?? []), ...(t.media?.videos ?? [])].map((m: any) => m.thumbnail_url ?? m.url).filter(Boolean);
        const isThread = /🧵|\bthread\b|1\/\d+/i.test(t.text ?? "") || !!t.replying_to_status;
        const type = t.media?.videos?.length ? "Media" : isThread ? "Thread" : media.length ? "Media" : "Post";
        return { ok: true, item: {
          type, text: (t.text ?? "").slice(0, 280),
          author_name: t.author?.name ?? parts[0], author_handle: "@" + (t.author?.screen_name ?? parts[0]),
          author_avatar: t.author?.avatar_url ?? null, media,
          metrics: { likes: t.likes ?? 0, retweets: t.retweets ?? 0, views: t.views ?? 0 }, url: clean,
        } };
      }
      const r = await fetch(`${API}/${parts[0]}`, { headers: { "user-agent": "Xtrnd/1.0" } });
      if (!r.ok) return { ok: false, error: "Couldn't read that account" };
      const j = (await r.json()) as { user?: any };
      const p = j.user;
      if (!p) return { ok: false, error: "Account not found" };
      return { ok: true, item: {
        type: "Account", text: (p.description ?? "").slice(0, 280),
        author_name: p.name ?? parts[0], author_handle: "@" + (p.screen_name ?? parts[0]),
        author_avatar: p.avatar_url ?? null, media: [],
        metrics: { likes: p.likes ?? 0, retweets: 0, views: p.followers ?? 0 }, url: clean,
      } };
    } catch (e) {
      console.error("unfurl failed", e);
      return { ok: false, error: "Lookup failed, fill in manually" };
    }
  });
