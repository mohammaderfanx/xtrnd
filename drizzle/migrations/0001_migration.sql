CREATE TABLE public.curator_profiles (
  id uuid PRIMARY KEY,
  handle text UNIQUE NOT NULL,
  reputation_score numeric NOT NULL DEFAULT 100,
  submissions_count integer NOT NULL DEFAULT 0,
  is_verified_curator boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.curator_profiles TO anon, authenticated;
GRANT ALL ON public.curator_profiles TO service_role;
ALTER TABLE public.curator_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Curators are public" ON public.curator_profiles FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.item_analytics_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.trending_items(id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  views_count numeric NOT NULL DEFAULT 0,
  likes_count numeric NOT NULL DEFAULT 0,
  retweets_count numeric NOT NULL DEFAULT 0,
  engagement_score numeric NOT NULL DEFAULT 0
);
CREATE INDEX ON public.item_analytics_history (item_id, recorded_at);
GRANT SELECT ON public.item_analytics_history TO anon, authenticated;
GRANT ALL ON public.item_analytics_history TO service_role;
ALTER TABLE public.item_analytics_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "History is public" ON public.item_analytics_history FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.calculate_engagement_score(likes numeric, retweets numeric, views numeric, created timestamptz)
RETURNS numeric LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT (coalesce(likes,0) * 1.0 + coalesce(retweets,0) * 2.5 + coalesce(views,0) * 0.01)
         / power(greatest(extract(epoch FROM (now() - created)) / 3600.0, 0) + 2, 1.5)
$$;

CREATE OR REPLACE FUNCTION public.rank_score(public.trending_items)
RETURNS numeric LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.calculate_engagement_score(
    ($1.metrics->>'likes')::numeric, ($1.metrics->>'retweets')::numeric, ($1.metrics->>'views')::numeric, $1.created_at)
$$;

CREATE OR REPLACE FUNCTION public.bookmark_counts()
RETURNS TABLE(item_id uuid, saves bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.item_id, count(*) FROM public.user_bookmarks b GROUP BY b.item_id
$$;
GRANT EXECUTE ON FUNCTION public.bookmark_counts() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.on_item_submitted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base text;
BEGIN
  INSERT INTO public.item_analytics_history (item_id, recorded_at, views_count, likes_count, retweets_count, engagement_score)
  VALUES (NEW.id, now(), coalesce((NEW.metrics->>'views')::numeric,0), coalesce((NEW.metrics->>'likes')::numeric,0),
          coalesce((NEW.metrics->>'retweets')::numeric,0), coalesce((NEW.metrics->>'engagement_score')::numeric,0));
  IF NEW.submitted_by IS NOT NULL THEN
    SELECT split_part(email,'@',1) INTO base FROM auth.users WHERE id = NEW.submitted_by;
    INSERT INTO public.curator_profiles (id, handle, submissions_count)
    VALUES (NEW.submitted_by, coalesce(base,'curator') || '_' || substr(NEW.submitted_by::text,1,4), 1)
    ON CONFLICT (id) DO UPDATE SET submissions_count = curator_profiles.submissions_count + 1,
      reputation_score = curator_profiles.reputation_score + 5;
  END IF;
  RETURN NEW;
END $$;

INSERT INTO public.trending_items (title_or_snippet,type,category,metrics,author_name,author_handle,author_avatar,external_url,created_at) VALUES
('We just open-sourced our entire design system: 400+ components, tokens, and Figma kit. Free forever. Link below 👇','Post','Design & UX','{"likes":22300,"retweets":6100,"views":1900000,"engagement_score":90}','Vercel','@vercel','https://unavatar.io/x/vercel','https://x.com/vercel',now()-interval '3 hours'),
('Bitcoin ETF inflows just hit a new daily record. Here is what on-chain data says happens next — and why this cycle is different 🧵','Thread','Crypto','{"likes":18900,"retweets":5200,"views":2400000,"engagement_score":89}','Coinbase','@coinbase','https://unavatar.io/x/coinbase','https://x.com/coinbase',now()-interval '10 hours');

-- Synthetic history snapshots (sqrt growth curve) for all seed items
INSERT INTO public.item_analytics_history (item_id, recorded_at, views_count, likes_count, retweets_count, engagement_score)
SELECT i.id, t.ts,
  round((i.metrics->>'views')::numeric * f.f), round((i.metrics->>'likes')::numeric * f.f),
  round((i.metrics->>'retweets')::numeric * f.f), (i.metrics->>'engagement_score')::numeric
FROM public.trending_items i
CROSS JOIN LATERAL (VALUES (now()-interval '24 hours'),(now()-interval '12 hours'),(now()-interval '6 hours'),(now()-interval '1 hour'),(now())) t(ts)
CROSS JOIN LATERAL (SELECT sqrt(greatest(extract(epoch FROM t.ts - i.created_at),0) / greatest(extract(epoch FROM now() - i.created_at),1)) AS f) f
WHERE t.ts >= i.created_at;

CREATE TRIGGER trending_items_submitted AFTER INSERT ON public.trending_items
FOR EACH ROW EXECUTE FUNCTION public.on_item_submitted();