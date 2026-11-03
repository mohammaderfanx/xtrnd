// Browser-safe Phase 4 rules shared by UI, server and tests.
export type AgentCriteria = { keywords: string[]; min_followers: number; semantic_query: string; run_interval: string };
export const RUN_INTERVALS = ["15m", "1h", "6h", "1d"] as const;
export const MAX_AGENTS = 5;

export function intervalMs(v: string | undefined) {
  const m = /^(\d+)\s*(m|h|d)$/.exec(v ?? "");
  if (!m) return 15 * 60e3;
  const n = Math.max(1, Number(m[1]));
  const ms = n * (m[2] === "m" ? 60e3 : m[2] === "h" ? 3600e3 : 864e5);
  return Math.max(15 * 60e3, ms); // agents never run more often than every 15 minutes
}

const TYPE_WORDS: Record<string, "Post" | "Account" | "Community" | "Thread" | "Media"> = {
  thread: "Thread", threads: "Thread", post: "Post", posts: "Post", tweet: "Post", tweets: "Post",
  account: "Account", accounts: "Account", creator: "Account", creators: "Account",
  community: "Community", communities: "Community", video: "Media", videos: "Media", media: "Media",
};

/** Extracts time window and item types from a natural-language query. */
export function parseNaturalQuery(q: string) {
  const text = q.toLowerCase();
  let days: number | null = null;
  const m = /(?:last|past)\s+(\d+)\s*(day|days|week|weeks|hour|hours)/.exec(text);
  if (m) days = Number(m[1]) * (m[2]!.startsWith("week") ? 7 : m[2]!.startsWith("hour") ? 1 / 24 : 1);
  else if (/\btoday\b|\blast 24h\b/.test(text)) days = 1;
  else if (/\bthis week\b|\blast week\b/.test(text)) days = 7;
  const types = [...new Set(text.split(/[^a-z]+/).map((w) => TYPE_WORDS[w]).filter(Boolean))] as ("Post" | "Account" | "Community" | "Thread" | "Media")[];
  return { days, types };
}
