import { describe, expect, it } from "vitest";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

describe("anonymous Phase 4 access", () => {
  for (const table of ["item_embeddings", "audio_briefs", "kg_nodes", "kg_edges"]) {
    it(`denies direct reads of ${table}`, async () => {
      expect(url).toBeTruthy();
      expect(key).toBeTruthy();
      const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
        headers: { apikey: key },
      });
      expect([401, 403]).toContain(response.status);
      const body = await response.json();
      expect(body.code).toBe("42501");
    });
  }
});