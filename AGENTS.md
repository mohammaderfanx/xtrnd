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
