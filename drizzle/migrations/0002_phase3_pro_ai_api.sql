CREATE TYPE public.plan_tier AS ENUM ('Free','Pro','Enterprise');

CREATE TABLE public.user_subscriptions (
  user_id uuid PRIMARY KEY,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_tier public.plan_tier NOT NULL DEFAULT 'Free',
  status text NOT NULL DEFAULT 'active',
  current_period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_subscriptions TO authenticated;
GRANT ALL ON public.user_subscriptions TO service_role;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own subscription read" ON public.user_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_pro(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_subscriptions s WHERE s.user_id = _uid
    AND s.plan_tier IN ('Pro','Enterprise') AND s.status IN ('active','trialing')
    AND (s.current_period_end IS NULL OR s.current_period_end > now()))
$$;
GRANT EXECUTE ON FUNCTION public.is_pro(uuid) TO authenticated;

CREATE TABLE public.custom_signal_feeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  filter_rules jsonb NOT NULL DEFAULT '{"keywords":[],"exclude":[],"match":"any","min_engagement":0,"categories":[],"handles":[],"types":[]}'::jsonb,
  webhook_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_signal_feeds TO authenticated;
GRANT ALL ON public.custom_signal_feeds TO service_role;
ALTER TABLE public.custom_signal_feeds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own feeds read" ON public.custom_signal_feeds FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Pro feeds insert" ON public.custom_signal_feeds FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_pro(auth.uid()));
CREATE POLICY "Pro feeds update" ON public.custom_signal_feeds FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND public.is_pro(auth.uid()));
CREATE POLICY "Own feeds delete" ON public.custom_signal_feeds FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.ai_item_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL UNIQUE REFERENCES public.trending_items(id) ON DELETE CASCADE,
  key_takeaways jsonb NOT NULL DEFAULT '[]'::jsonb,
  sentiment_score numeric NOT NULL DEFAULT 0,
  target_audience text,
  actionable_quotes jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_item_insights TO anon, authenticated;
GRANT ALL ON public.ai_item_insights TO service_role;
ALTER TABLE public.ai_item_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insights are public" ON public.ai_item_insights FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  name text NOT NULL,
  rate_limit_per_min integer NOT NULL DEFAULT 60,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.api_keys (key_hash);
GRANT SELECT, INSERT, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own keys read" ON public.api_keys FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Pro keys insert" ON public.api_keys FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_pro(auth.uid()) AND rate_limit_per_min <= 600);
CREATE POLICY "Own keys delete" ON public.api_keys FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.ai_usage (
  user_id uuid NOT NULL,
  day date NOT NULL DEFAULT current_date,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
GRANT SELECT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own usage read" ON public.ai_usage FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.api_usage (
  key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (key_id, window_start)
);
GRANT ALL ON public.api_usage TO service_role;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- Free users: 3 AI syntheses/day. Pro: unlimited. Called as the signed-in user.
CREATE OR REPLACE FUNCTION public.consume_ai_credit()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); used integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF public.is_pro(uid) THEN RETURN -1; END IF;
  INSERT INTO public.ai_usage (user_id, day, count) VALUES (uid, current_date, 0) ON CONFLICT DO NOTHING;
  UPDATE public.ai_usage SET count = count + 1 WHERE user_id = uid AND day = current_date AND count < 3 RETURNING count INTO used;
  IF used IS NULL THEN RETURN 0; END IF;
  RETURN 3 - used + 1;
END $$;
REVOKE ALL ON FUNCTION public.consume_ai_credit() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_credit() TO authenticated;

-- API key auth + fixed-window per-minute rate limit.
CREATE OR REPLACE FUNCTION public.api_authorize(p_hash text)
RETURNS TABLE(allowed boolean, status integer, lim integer, remaining integer, reset_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k public.api_keys; w timestamptz := date_trunc('minute', now()); c integer;
BEGIN
  SELECT * INTO k FROM public.api_keys WHERE key_hash = p_hash;
  IF NOT FOUND THEN RETURN QUERY SELECT false, 401, 0, 0, w + interval '1 minute'; RETURN; END IF;
  IF NOT public.is_pro(k.user_id) THEN RETURN QUERY SELECT false, 402, k.rate_limit_per_min, 0, w + interval '1 minute'; RETURN; END IF;
  INSERT INTO public.api_usage (key_id, window_start, count) VALUES (k.id, w, 1)
  ON CONFLICT (key_id, window_start) DO UPDATE SET count = api_usage.count + 1 RETURNING count INTO c;
  UPDATE public.api_keys SET last_used_at = now() WHERE id = k.id;
  DELETE FROM public.api_usage WHERE key_id = k.id AND window_start < w - interval '10 minutes';
  IF c > k.rate_limit_per_min THEN RETURN QUERY SELECT false, 429, k.rate_limit_per_min, 0, w + interval '1 minute'; RETURN; END IF;
  RETURN QUERY SELECT true, 200, k.rate_limit_per_min, k.rate_limit_per_min - c, w + interval '1 minute';
END $$;
REVOKE ALL ON FUNCTION public.api_authorize(text) FROM public;
GRANT EXECUTE ON FUNCTION public.api_authorize(text) TO anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.trending_items;

INSERT INTO public.ai_item_insights (item_id, key_takeaways, sentiment_score, target_audience, actionable_quotes)
SELECT i.id, v.t::jsonb, v.s, v.a, v.q::jsonb FROM public.trending_items i JOIN (VALUES
 ('@karpathy','["Evals beat prompt tweaking: build a test set before you tune anything.","Design tools the model can''t misuse — narrow inputs, explicit errors.","Production agents fail on edge cases, so log every trajectory and review weekly."]',0.6,'AI engineers shipping agents','["Your prompt is the least important part.","If you can''t measure it, you can''t improve it."]'),
 ('@levelsio','["$1M ARR is reachable solo by shipping daily and talking to users.","Skip VC and ads; distribution comes from building in public.","Small, focused products compound faster than one big bet."]',0.8,'Indie hackers and solo founders','["Just ship every single day.","No VC, no ads."]'),
 ('@antonosika','["Follow for daily notes on AI-native product building.","Focus on turning ideas into working software in minutes.","Useful signal for builders tracking the AI app-builder space."]',0.5,'Founders and product builders','["Building the last piece of software."]'),
 ('@OpenAI','["Realtime voice translation now runs at ~180ms latency.","Live bilingual conversations become practical for support and travel.","Expect a wave of voice-first apps built on this model."]',0.7,'Developers building voice products','["180ms latency, live, between Japanese and Portuguese."]'),
 ('@raunofreiberg','["The best interfaces disappear: reduce steps, not features.","Ten real examples show restraint beating decoration.","Audit your UI for elements that exist only to look busy."]',0.5,'Product designers and frontend devs','["Good design is as little design as possible."]'),
 ('@buildinpublic','["140K founders share revenue, launches and lessons openly.","Weekly MRR threads every Friday make for easy benchmarking.","Great place to find early users and accountability."]',0.6,'Early-stage founders','["Weekly MRR threads every Friday."]'),
 ('@LynAldenContact','["The Fed held rates and markets shrugged.","Liquidity, not the rate level, is driving asset prices right now.","Watch liquidity indicators before reacting to rate headlines."]',0.0,'Investors and macro watchers','["Liquidity matters more than rates right now."]'),
 ('@VitalikButerin','["The upgrade mainly changes economics for L2 rollups.","Fees should fall for users of L2s.","Staking yields may drop as the economics shift."]',0.2,'Crypto builders and ETH holders','["Why staking yields might drop."]'),
 ('@vercel','["A full design system — 400+ components, tokens, Figma kit — is now open source.","Free forever, so teams can adopt it without licensing worries.","A fast way to standardize UI across products."]',0.8,'Design-system teams and frontend devs','["Free forever."]'),
 ('@coinbase','["Bitcoin ETFs just set a new daily inflow record.","On-chain data is framed as a signal for what comes next.","Thread argues this cycle differs from past ones."]',0.4,'Crypto investors','["Bitcoin ETF inflows just hit a new daily record."]')
) AS v(h,t,s,a,q) ON v.h = i.author_handle WHERE i.submitted_by IS NULL
ON CONFLICT (item_id) DO NOTHING;