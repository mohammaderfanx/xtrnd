// Server-only: Lovable AI Gateway (OpenAI Responses API), streamed and consumed server-side.
export type Insight = {
  key_takeaways: string[];
  sentiment_score: number;
  target_audience: string;
  actionable_quotes: string[];
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["key_takeaways", "sentiment_score", "target_audience", "actionable_quotes"],
  properties: {
    key_takeaways: { type: "array", items: { type: "string" } },
    sentiment_score: { type: "number" },
    target_audience: { type: "string" },
    actionable_quotes: { type: "array", items: { type: "string" } },
  },
};

export class GatewayError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function synthesize(text: string, meta: { handle: string; type: string; category: string }): Promise<Insight> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new GatewayError(401, "AI is not configured");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      instructions:
        "You de-noise X.com posts into signal. Return exactly 3 key takeaways (each under 20 words, concrete, no fluff), " +
        "a sentiment_score between -1 and 1, a short target_audience (under 8 words), and 1-3 actionable_quotes taken verbatim or near-verbatim from the text. " +
        "If the text is very short, infer cautiously and do not invent facts.",
      input: `Author: ${meta.handle}\nType: ${meta.type}\nCategory: ${meta.category}\n\nContent:\n${text.slice(0, 6000)}`,
      text: { format: { type: "json_schema", name: "insight", strict: true, schema: SCHEMA } },
    }),
  });
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    let msg = "AI request failed";
    try { msg = JSON.parse(body)?.error?.message ?? JSON.parse(body)?.message ?? msg; } catch {}
    if (res.status === 402) msg = "AI credits are used up for this workspace.";
    if (res.status === 429) msg = "AI is busy right now, try again in a minute.";
    throw new GatewayError(res.status, msg);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", out = "", refused = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const ev = JSON.parse(data);
        if (ev.type === "response.output_text.delta") out += ev.delta ?? "";
        else if (ev.type === "response.refusal.delta") refused += ev.delta ?? "";
        else if (ev.type === "response.failed" || ev.type === "error") throw new GatewayError(502, ev.response?.error?.message ?? ev.message ?? "AI failed");
      } catch (e) { if (e instanceof GatewayError) throw e; }
    }
  }
  if (refused || !out) throw new GatewayError(422, "The AI declined to summarize this item.");
  const p = JSON.parse(out) as Insight;
  return {
    key_takeaways: p.key_takeaways.slice(0, 3).map((s) => s.slice(0, 200)),
    sentiment_score: Math.max(-1, Math.min(1, Number(p.sentiment_score) || 0)),
    target_audience: (p.target_audience ?? "").slice(0, 80),
    actionable_quotes: p.actionable_quotes.slice(0, 3).map((s) => s.slice(0, 280)),
  };
}

/** Try to get fresher/full text from X; fall back silently if deleted, private or rate-limited. */
export async function fetchFreshText(url: string): Promise<string | null> {
  try {
    const p = new URL(url).pathname.split("/").filter(Boolean);
    const i = p.indexOf("status");
    if (i < 1 || !p[i + 1]) return null;
    const r = await fetch(`https://api.fxtwitter.com/${p[0]}/status/${p[i + 1]}`, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const j = (await r.json()) as { tweet?: { text?: string } };
    return j.tweet?.text ?? null;
  } catch { return null; }
}
