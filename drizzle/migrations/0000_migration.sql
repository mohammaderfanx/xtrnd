CREATE TYPE public.item_type AS ENUM ('Post','Account','Community','Thread','Media');
CREATE TYPE public.item_category AS ENUM ('AI & Tech','SaaS & Startups','Design & UX','Finance','Crypto');

CREATE TABLE public.trending_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_or_snippet text NOT NULL,
  type public.item_type NOT NULL,
  category public.item_category NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{"likes":0,"retweets":0,"views":0,"engagement_score":50}'::jsonb,
  author_name text,
  author_handle text NOT NULL,
  author_avatar text,
  external_url text NOT NULL,
  submitted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.trending_items TO anon;
GRANT SELECT, INSERT ON public.trending_items TO authenticated;
GRANT ALL ON public.trending_items TO service_role;
ALTER TABLE public.trending_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read items" ON public.trending_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Signed-in users submit items" ON public.trending_items FOR INSERT TO authenticated WITH CHECK (submitted_by = auth.uid());

CREATE TABLE public.user_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES public.trending_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_bookmarks TO authenticated;
GRANT ALL ON public.user_bookmarks TO service_role;
ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own bookmarks read" ON public.user_bookmarks FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own bookmarks insert" ON public.user_bookmarks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own bookmarks delete" ON public.user_bookmarks FOR DELETE TO authenticated USING (user_id = auth.uid());

INSERT INTO public.trending_items (title_or_snippet,type,category,metrics,author_name,author_handle,author_avatar,external_url,created_at) VALUES
('I spent 6 months building agents in production. Here are 14 lessons nobody tells you about evals, tool design, and why your prompt is the least important part 🧵','Thread','AI & Tech','{"likes":48200,"retweets":9100,"views":4200000,"engagement_score":98}','Andrej Karpathy','@karpathy','https://unavatar.io/x/karpathy','https://x.com/karpathy',now()-interval '6 hours'),
('Bootstrapped to $1M ARR with zero employees. No VC, no ads, just shipping every single day and talking to users. AMA.','Post','SaaS & Startups','{"likes":31400,"retweets":4200,"views":2900000,"engagement_score":95}','Pieter Levels','@levelsio','https://unavatar.io/x/levelsio','https://x.com/levelsio',now()-interval '14 hours'),
('Founder of Lovable. Building the last piece of software. Daily notes on AI-native product building.','Account','AI & Tech','{"likes":0,"retweets":0,"views":890000,"engagement_score":91}','Anton Osika','@antonosika','https://unavatar.io/x/antonosika','https://x.com/antonosika',now()-interval '2 days'),
('Demo: our new realtime voice model translating a live conversation between Japanese and Portuguese with 180ms latency. Video ↓','Media','AI & Tech','{"likes":72100,"retweets":15800,"views":11300000,"engagement_score":99}','OpenAI','@OpenAI','https://unavatar.io/x/OpenAI','https://x.com/OpenAI',now()-interval '20 hours'),
('Good design is as little design as possible. A thread on 10 interfaces that got out of the way — and what we can learn from them.','Thread','Design & UX','{"likes":12800,"retweets":2600,"views":980000,"engagement_score":88}','Rauno Freiberg','@raunofreiberg','https://unavatar.io/x/raunofreiberg','https://x.com/raunofreiberg',now()-interval '3 days'),
('Build in Public — 140K founders sharing revenue, launches, and lessons in the open. Weekly MRR threads every Friday.','Community','SaaS & Startups','{"likes":0,"retweets":0,"views":1500000,"engagement_score":84}','Build in Public','@buildinpublic','https://unavatar.io/x/buildinpublic','https://x.com/i/communities',now()-interval '5 days'),
('The Fed did not cut. Markets did not care. Here is the one chart that explains why liquidity matters more than rates right now.','Post','Finance','{"likes":9400,"retweets":2100,"views":1100000,"engagement_score":82}','Lyn Alden','@LynAldenContact','https://unavatar.io/x/LynAldenContact','https://x.com/LynAldenContact',now()-interval '30 hours'),
('Ethereum''s next upgrade explained in 8 tweets: what changes for L2s, fees, and why staking yields might drop. 🧵','Thread','Crypto','{"likes":15600,"retweets":3900,"views":1700000,"engagement_score":86}','Vitalik Buterin','@VitalikButerin','https://unavatar.io/x/VitalikButerin','https://x.com/VitalikButerin',now()-interval '40 days');