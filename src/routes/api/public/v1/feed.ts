import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authorize, json, preflight, shape } from "@/lib/api-auth.server";

const TYPES = ["Post", "Account", "Community", "Thread", "Media"] as const;
const CATS = ["AI & Tech", "SaaS & Startups", "Design & UX", "Finance", "Crypto"] as const;

const Q = z.object({
  type: z.enum(TYPES).optional(),
  category: z.enum(CATS).optional(),
  q: z.string().max(100).optional(),
  min_score: z.coerce.number().min(0).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  before: z.string().datetime().optional(),
});

export const Route = createFileRoute("/api/public/v1/feed")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        const a = await authorize(request);
        if ("error" in a) return a.error;
        const p = Q.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!p.success) return json({ error: "Invalid query", issues: p.error.issues }, 400, a.headers);
        const f = p.data;
        let q = a.sb.from("trending_items").select("*, rank_score").order("created_at", { ascending: false }).limit(f.limit);
        if (f.type) q = q.eq("type", f.type);
        if (f.category) q = q.eq("category", f.category);
        if (f.before) q = q.lt("created_at", f.before);
        if (f.q) q = q.ilike("title_or_snippet", `%${f.q.replace(/[%_]/g, "")}%`);
        if (f.min_score !== undefined) q = q.gte("metrics->engagement_score", f.min_score);
        const { data, error } = await q;
        if (error) return json({ error: "Query failed" }, 500, a.headers);
        const rows = ((data ?? []) as unknown as Parameters<typeof shape>[0][]).map(shape);
        return json({ data: rows, next_before: rows.at(-1)?.created_at ?? null }, 200, a.headers);
      },
    },
  },
});
