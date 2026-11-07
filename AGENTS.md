<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- X.com link unfurling runs in a server function calling the keyless fxtwitter API; no X API key is stored, so swapping to the official API only touches src/lib/unfurl.functions.ts.
- Velocity labels (Viral/Rising/Evergreen) are computed client-side from item_analytics_history snapshots; ranking uses the `rank_score` computed column backed by `calculate_engagement_score`.
- Pro gating is enforced in the database: `is_pro()` backs RLS on custom_signal_feeds/api_keys, `consume_ai_credit()` meters free AI use, and `api_authorize()` does API key auth + per-minute rate limiting (no Redis).
- Plan changes currently go through the demo `setDemoPlan` server function; real payments should write user_subscriptions instead and that function should be removed.
- AI summaries are generated in src/lib/ai.server.ts and cached in ai_item_insights, which only the server writes.
- API limits are assigned and revalidated from active subscriptions in database functions and triggers, so direct key inserts and plan changes cannot bypass tier limits.
- Alert dispatch must claim each fresh item through an owner-checked database function before privileged webhook delivery, preventing cross-user and repeated dispatch.
- Digest selection bounds live in a browser-safe helper shared by the page and tests, keeping export eligibility consistent.
- Phase 4 AI work (embeddings queue, agent runs, daily audio brief) lives in src/lib/intel.server.ts and runs from the cron-authenticated /api/public/jobs/agent-tick route behind a database lease, so scheduled work is single-flight and never blocks item inserts.
- Embeddings use the gateway embedding model at 1536 dimensions; agent match thresholds are calibrated to that model's score range, so re-check the threshold if the model changes.
- Workspace isolation is enforced by RLS via workspace_role_of(); members are only added through the owner-checked invite_workspace_member function.
- Audio briefs are cached per day in a private storage bucket and served through short-lived signed URLs to avoid duplicate generation.
