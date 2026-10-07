import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authorize, json, preflight, shape } from "@/lib/api-auth.server";

const Q = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  hours: z.coerce.number().int().min(1).max(24 * 90).optional(),
});

export const Route = createFileRoute("/api/public/v1/trending")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        const a = await authorize(request);
        if ("error" in a) return a.error;
        const p = Q.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!p.success) return json({ error: "Invalid query", issues: p.error.issues }, 400, a.headers);
        let q = a.sb.from("trending_items").select("*, rank_score").order("created_at", { ascending: false }).limit(200);
        if (p.data.hours) q = q.gte("created_at", new Date(Date.now() - p.data.hours * 3600e3).toISOString());
        const { data, error } = await q;
        if (error) return json({ error: "Query failed" }, 500, a.headers);
        const rows = ((data ?? []) as unknown as Parameters<typeof shape>[0][])
          .sort((x, y) => (y.rank_score ?? 0) - (x.rank_score ?? 0)).slice(0, p.data.limit).map(shape);
        return json({ data: rows }, 200, a.headers);
      },
    },
  },
});
