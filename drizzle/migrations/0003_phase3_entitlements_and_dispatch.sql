CREATE OR REPLACE FUNCTION public.api_plan_limit(_uid uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT COALESCE((SELECT CASE WHEN s.plan_tier = 'Enterprise' THEN 600 ELSE 60 END FROM public.user_subscriptions s WHERE s.user_id = _uid AND s.plan_tier IN ('Pro','Enterprise') AND s.status IN ('active','trialing') AND (s.current_period_end IS NULL OR s.current_period_end > now())), 0)
$$;
REVOKE ALL ON FUNCTION public.api_plan_limit(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.api_plan_limit(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.assign_api_key_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 NEW.rate_limit_per_min := public.api_plan_limit(NEW.user_id);
 IF NEW.rate_limit_per_min = 0 THEN RAISE EXCEPTION 'API keys require an active Pro plan'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER assign_api_key_limit BEFORE INSERT ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.assign_api_key_limit();

CREATE OR REPLACE FUNCTION public.sync_api_key_limits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 UPDATE public.api_keys SET rate_limit_per_min = CASE WHEN NEW.plan_tier = 'Enterprise' THEN 600 ELSE 60 END WHERE user_id = NEW.user_id;
 RETURN NEW;
END $$;
CREATE TRIGGER sync_api_key_limits AFTER INSERT OR UPDATE OF plan_tier, status, current_period_end ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION public.sync_api_key_limits();

CREATE OR REPLACE FUNCTION public.api_authorize(p_hash text)
RETURNS TABLE(allowed boolean, status integer, lim integer, remaining integer, reset_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k public.api_keys; w timestamptz := date_trunc('minute', now()); c integer; plan_limit integer;
BEGIN
 SELECT * INTO k FROM public.api_keys WHERE key_hash = p_hash;
 IF NOT FOUND THEN RETURN QUERY SELECT false, 401, 0, 0, w + interval '1 minute'; RETURN; END IF;
 plan_limit := public.api_plan_limit(k.user_id);
 IF plan_limit = 0 THEN RETURN QUERY SELECT false, 402, 0, 0, w + interval '1 minute'; RETURN; END IF;
 INSERT INTO public.api_usage (key_id, window_start, count) VALUES (k.id, w, 1)
 ON CONFLICT (key_id, window_start) DO UPDATE SET count = api_usage.count + 1 RETURNING count INTO c;
 UPDATE public.api_keys SET last_used_at = now(), rate_limit_per_min = plan_limit WHERE id = k.id;
 DELETE FROM public.api_usage WHERE key_id = k.id AND window_start < w - interval '10 minutes';
 IF c > plan_limit THEN RETURN QUERY SELECT false, 429, plan_limit, 0, w + interval '1 minute'; RETURN; END IF;
 RETURN QUERY SELECT true, 200, plan_limit, plan_limit - c, w + interval '1 minute';
END $$;
REVOKE ALL ON FUNCTION public.api_authorize(text) FROM public;
GRANT EXECUTE ON FUNCTION public.api_authorize(text) TO anon, authenticated;

CREATE TABLE public.signal_dispatch_claims (
 item_id uuid PRIMARY KEY REFERENCES public.trending_items(id) ON DELETE CASCADE,
 claimed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.signal_dispatch_claims TO service_role;
ALTER TABLE public.signal_dispatch_claims ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.claim_signal_dispatch(p_item_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE claimed uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.trending_items WHERE id = p_item_id AND submitted_by = auth.uid() AND created_at > now() - interval '10 minutes') THEN RETURN false; END IF;
 INSERT INTO public.signal_dispatch_claims (item_id) VALUES (p_item_id) ON CONFLICT DO NOTHING RETURNING item_id INTO claimed;
 RETURN claimed IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.claim_signal_dispatch(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_signal_dispatch(uuid) TO authenticated;