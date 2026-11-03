CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE public.item_embeddings (
  item_id uuid PRIMARY KEY REFERENCES public.trending_items(id) ON DELETE CASCADE,
  embedding extensions.vector(1536) NOT NULL,
  content_chunk text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.item_embeddings TO anon, authenticated;
GRANT ALL ON public.item_embeddings TO service_role;
ALTER TABLE public.item_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "embeddings public read" ON public.item_embeddings FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX item_embeddings_hnsw ON public.item_embeddings USING hnsw (embedding extensions.vector_cosine_ops);

CREATE TABLE public.embedding_queue (
  item_id uuid PRIMARY KEY REFERENCES public.trending_items(id) ON DELETE CASCADE,
  enqueued_at timestamptz NOT NULL DEFAULT now(),
  attempts int NOT NULL DEFAULT 0
);
GRANT ALL ON public.embedding_queue TO service_role;
ALTER TABLE public.embedding_queue ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.enqueue_embedding() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.embedding_queue(item_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.enqueue_embedding FROM public, anon, authenticated;
CREATE TRIGGER trending_items_enqueue_embedding AFTER INSERT OR UPDATE OF title_or_snippet ON public.trending_items
FOR EACH ROW EXECUTE FUNCTION public.enqueue_embedding();
INSERT INTO public.embedding_queue(item_id) SELECT id FROM public.trending_items ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.hybrid_search(query_embedding extensions.vector(1536), query_text text, match_count int DEFAULT 20, since timestamptz DEFAULT NULL, item_types public.item_type[] DEFAULT NULL)
RETURNS TABLE(item_id uuid, similarity double precision, text_rank double precision, score double precision)
LANGUAGE sql STABLE SET search_path = public, extensions AS $$
  WITH s AS (
    SELECT t.id,
      1 - (e.embedding <=> query_embedding) AS sim,
      ts_rank(to_tsvector('english', t.title_or_snippet || ' ' || t.author_handle), websearch_to_tsquery('english', coalesce(query_text,''))) AS tr
    FROM public.trending_items t JOIN public.item_embeddings e ON e.item_id = t.id
    WHERE (since IS NULL OR t.created_at >= since) AND (item_types IS NULL OR t.type = ANY(item_types))
  )
  SELECT id, sim, tr, 0.75 * sim + 0.25 * least(1, tr * 10) AS score FROM s
  ORDER BY score DESC
  LIMIT least(greatest(match_count,1),50);
$$;

CREATE OR REPLACE FUNCTION public.similar_items(p_item_id uuid, match_count int DEFAULT 5)
RETURNS TABLE(item_id uuid, similarity double precision)
LANGUAGE sql STABLE SET search_path = public, extensions AS $$
  SELECT e.item_id, 1 - (e.embedding <=> src.embedding)
  FROM public.item_embeddings e, public.item_embeddings src
  WHERE src.item_id = p_item_id AND e.item_id <> p_item_id
  ORDER BY e.embedding <=> src.embedding
  LIMIT least(greatest(match_count,1),20);
$$;
GRANT EXECUTE ON FUNCTION public.hybrid_search TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.similar_items TO anon, authenticated, service_role;

CREATE TABLE public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  system_prompt text NOT NULL DEFAULT '' CHECK (char_length(system_prompt) <= 2000),
  criteria_config jsonb NOT NULL DEFAULT '{"keywords":[],"min_followers":0,"semantic_query":"","run_interval":"15m"}',
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  query_embedding extensions.vector(1536),
  embedded_query text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_agents TO authenticated;
GRANT ALL ON public.ai_agents TO service_role;
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agents own" ON public.ai_agents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  scanned int NOT NULL DEFAULT 0,
  hits int NOT NULL DEFAULT 0,
  precision double precision,
  status text NOT NULL DEFAULT 'ok',
  log text
);
GRANT SELECT ON public.agent_runs TO authenticated;
GRANT ALL ON public.agent_runs TO service_role;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "runs own" ON public.agent_runs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.ai_agents a WHERE a.id = agent_id AND a.user_id = auth.uid()));

CREATE TABLE public.agent_hits (
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.trending_items(id) ON DELETE CASCADE,
  similarity double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agent_id, item_id)
);
GRANT SELECT ON public.agent_hits TO authenticated;
GRANT ALL ON public.agent_hits TO service_role;
ALTER TABLE public.agent_hits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hits own" ON public.agent_hits FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.ai_agents a WHERE a.id = agent_id AND a.user_id = auth.uid()));

CREATE TABLE public.job_leases (name text PRIMARY KEY, locked_until timestamptz NOT NULL);
GRANT ALL ON public.job_leases TO service_role;
ALTER TABLE public.job_leases ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.acquire_lease(p_name text, p_seconds int) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ok boolean;
BEGIN
  INSERT INTO public.job_leases(name, locked_until) VALUES (p_name, now() + make_interval(secs => p_seconds))
  ON CONFLICT (name) DO UPDATE SET locked_until = EXCLUDED.locked_until WHERE public.job_leases.locked_until < now()
  RETURNING true INTO ok;
  RETURN coalesce(ok, false);
END $$;
REVOKE EXECUTE ON FUNCTION public.acquire_lease FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_lease TO service_role;

CREATE TYPE public.workspace_role AS ENUM ('owner','editor','viewer');
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  owner_id uuid NOT NULL,
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.workspace_members (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.workspace_role NOT NULL DEFAULT 'viewer',
  email text,
  PRIMARY KEY (workspace_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
GRANT ALL ON public.workspace_members TO service_role;

CREATE OR REPLACE FUNCTION public.workspace_role_of(_ws uuid, _uid uuid) RETURNS public.workspace_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.workspace_members WHERE workspace_id = _ws AND user_id = _uid
$$;
GRANT EXECUTE ON FUNCTION public.workspace_role_of TO authenticated, service_role;

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws member read" ON public.workspaces FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.workspace_role_of(id, auth.uid()) IS NOT NULL);
CREATE POLICY "ws create own" ON public.workspaces FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND stripe_subscription_id IS NULL);
CREATE POLICY "ws owner update" ON public.workspaces FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "ws owner delete" ON public.workspaces FOR DELETE TO authenticated USING (owner_id = auth.uid());

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read" ON public.workspace_members FOR SELECT TO authenticated USING (public.workspace_role_of(workspace_id, auth.uid()) IS NOT NULL);
CREATE POLICY "owner manages members" ON public.workspace_members FOR UPDATE TO authenticated
  USING (public.workspace_role_of(workspace_id, auth.uid()) = 'owner' AND user_id <> auth.uid())
  WITH CHECK (role <> 'owner');
CREATE POLICY "owner removes or self leaves" ON public.workspace_members FOR DELETE TO authenticated
  USING ((public.workspace_role_of(workspace_id, auth.uid()) = 'owner' AND user_id <> auth.uid()) OR (user_id = auth.uid() AND role <> 'owner'));

CREATE OR REPLACE FUNCTION public.add_workspace_owner() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.workspace_members(workspace_id, user_id, role, email)
  VALUES (NEW.id, NEW.owner_id, 'owner', (SELECT email FROM auth.users WHERE id = NEW.owner_id));
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.add_workspace_owner FROM public, anon, authenticated;
CREATE TRIGGER workspaces_add_owner AFTER INSERT ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.add_workspace_owner();

CREATE OR REPLACE FUNCTION public.invite_workspace_member(p_ws uuid, p_email text, p_role public.workspace_role) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target uuid;
BEGIN
  IF public.workspace_role_of(p_ws, auth.uid()) IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION 'Only the workspace owner can invite'; END IF;
  IF p_role = 'owner' THEN RAISE EXCEPTION 'Invalid role'; END IF;
  SELECT id INTO target FROM auth.users WHERE lower(email) = lower(trim(p_email));
  IF target IS NULL THEN RETURN false; END IF;
  INSERT INTO public.workspace_members(workspace_id, user_id, role, email) VALUES (p_ws, target, p_role, lower(trim(p_email)))
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role WHERE public.workspace_members.role <> 'owner';
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.invite_workspace_member FROM public, anon;
GRANT EXECUTE ON FUNCTION public.invite_workspace_member TO authenticated;

CREATE TABLE public.item_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.trending_items(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  comment_text text NOT NULL DEFAULT '' CHECK (char_length(comment_text) <= 2000),
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX item_annotations_ws ON public.item_annotations(workspace_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.item_annotations TO authenticated;
GRANT ALL ON public.item_annotations TO service_role;
ALTER TABLE public.item_annotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ann member read" ON public.item_annotations FOR SELECT TO authenticated USING (public.workspace_role_of(workspace_id, auth.uid()) IS NOT NULL);
CREATE POLICY "ann editor write" ON public.item_annotations FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() AND public.workspace_role_of(workspace_id, auth.uid()) IN ('owner','editor'));
CREATE POLICY "ann delete own or owner" ON public.item_annotations FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.workspace_role_of(workspace_id, auth.uid()) = 'owner');
ALTER PUBLICATION supabase_realtime ADD TABLE public.item_annotations;

CREATE TABLE public.audio_briefs (
  day date PRIMARY KEY,
  item_ids uuid[] NOT NULL,
  script text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audio_briefs TO anon, authenticated;
GRANT ALL ON public.audio_briefs TO service_role;
ALTER TABLE public.audio_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "briefs public read" ON public.audio_briefs FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.kg_nodes (id text PRIMARY KEY, label text NOT NULL, kind text NOT NULL);
CREATE TABLE public.kg_edges (source text NOT NULL REFERENCES public.kg_nodes(id) ON DELETE CASCADE, target text NOT NULL REFERENCES public.kg_nodes(id) ON DELETE CASCADE, relation text NOT NULL, PRIMARY KEY (source, target, relation));
GRANT SELECT ON public.kg_nodes TO anon, authenticated;
GRANT SELECT ON public.kg_edges TO anon, authenticated;
GRANT ALL ON public.kg_nodes TO service_role;
GRANT ALL ON public.kg_edges TO service_role;
ALTER TABLE public.kg_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kg_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kg nodes read" ON public.kg_nodes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "kg edges read" ON public.kg_edges FOR SELECT TO anon, authenticated USING (true);