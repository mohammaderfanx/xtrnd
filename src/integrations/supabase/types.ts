export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      agent_hits: {
        Row: {
          agent_id: string
          created_at: string
          item_id: string
          similarity: number
        }
        Insert: {
          agent_id: string
          created_at?: string
          item_id: string
          similarity: number
        }
        Update: {
          agent_id?: string
          created_at?: string
          item_id?: string
          similarity?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_hits_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_hits_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "trending_items"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent_id: string
          hits: number
          id: string
          log: string | null
          precision: number | null
          scanned: number
          started_at: string
          status: string
        }
        Insert: {
          agent_id: string
          hits?: number
          id?: string
          log?: string | null
          precision?: number | null
          scanned?: number
          started_at?: string
          status?: string
        }
        Update: {
          agent_id?: string
          hits?: number
          id?: string
          log?: string | null
          precision?: number | null
          scanned?: number
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          created_at: string
          criteria_config: Json
          embedded_query: string | null
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          query_embedding: string | null
          system_prompt: string
          user_id: string
        }
        Insert: {
          created_at?: string
          criteria_config?: Json
          embedded_query?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name: string
          query_embedding?: string | null
          system_prompt?: string
          user_id: string
        }
        Update: {
          created_at?: string
          criteria_config?: Json
          embedded_query?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          query_embedding?: string | null
          system_prompt?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_item_insights: {
        Row: {
          actionable_quotes: Json
          generated_at: string
          id: string
          item_id: string
          key_takeaways: Json
          sentiment_score: number
          target_audience: string | null
        }
        Insert: {
          actionable_quotes?: Json
          generated_at?: string
          id?: string
          item_id: string
          key_takeaways?: Json
          sentiment_score?: number
          target_audience?: string | null
        }
        Update: {
          actionable_quotes?: Json
          generated_at?: string
          id?: string
          item_id?: string
          key_takeaways?: Json
          sentiment_score?: number
          target_audience?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_item_insights_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "trending_items"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          count: number
          day: string
          user_id: string
        }
        Insert: {
          count?: number
          day?: string
          user_id: string
        }
        Update: {
          count?: number
          day?: string
          user_id?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          rate_limit_per_min: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          rate_limit_per_min?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          rate_limit_per_min?: number
          user_id?: string
        }
        Relationships: []
      }
      api_usage: {
        Row: {
          count: number
          key_id: string
          window_start: string
        }
        Insert: {
          count?: number
          key_id: string
          window_start: string
        }
        Update: {
          count?: number
          key_id?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_briefs: {
        Row: {
          created_at: string
          day: string
          item_ids: string[]
          script: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          day: string
          item_ids: string[]
          script: string
          storage_path: string
        }
        Update: {
          created_at?: string
          day?: string
          item_ids?: string[]
          script?: string
          storage_path?: string
        }
        Relationships: []
      }
      curator_profiles: {
        Row: {
          created_at: string
          handle: string
          id: string
          is_verified_curator: boolean
          reputation_score: number
          submissions_count: number
        }
        Insert: {
          created_at?: string
          handle: string
          id: string
          is_verified_curator?: boolean
          reputation_score?: number
          submissions_count?: number
        }
        Update: {
          created_at?: string
          handle?: string
          id?: string
          is_verified_curator?: boolean
          reputation_score?: number
          submissions_count?: number
        }
        Relationships: []
      }
      custom_signal_feeds: {
        Row: {
          created_at: string
          filter_rules: Json
          id: string
          name: string
          user_id: string
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          filter_rules?: Json
          id?: string
          name: string
          user_id: string
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          filter_rules?: Json
          id?: string
          name?: string
          user_id?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      embedding_queue: {
        Row: {
          attempts: number
          enqueued_at: string
          item_id: string
        }
        Insert: {
          attempts?: number
          enqueued_at?: string
          item_id: string
        }
        Update: {
          attempts?: number
          enqueued_at?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "embedding_queue_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "trending_items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_analytics_history: {
        Row: {
          engagement_score: number
          id: string
          item_id: string
          likes_count: number
          recorded_at: string
          retweets_count: number
          views_count: number
        }
        Insert: {
          engagement_score?: number
          id?: string
          item_id: string
          likes_count?: number
          recorded_at?: string
          retweets_count?: number
          views_count?: number
        }
        Update: {
          engagement_score?: number
          id?: string
          item_id?: string
          likes_count?: number
          recorded_at?: string
          retweets_count?: number
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "item_analytics_history_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "trending_items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_annotations: {
        Row: {
          author_id: string
          comment_text: string
          created_at: string
          id: string
          item_id: string
          tags: string[]
          workspace_id: string
        }
        Insert: {
          author_id: string
          comment_text?: string
          created_at?: string
          id?: string
          item_id: string
          tags?: string[]
          workspace_id: string
        }
        Update: {
          author_id?: string
          comment_text?: string
          created_at?: string
          id?: string
          item_id?: string
          tags?: string[]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_annotations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "trending_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_annotations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      item_embeddings: {
        Row: {
          content_chunk: string
          created_at: string
          embedding: string
          item_id: string
        }
        Insert: {
          content_chunk: string
          created_at?: string
          embedding: string
          item_id: string
        }
        Update: {
          content_chunk?: string
          created_at?: string
          embedding?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_embeddings_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "trending_items"
            referencedColumns: ["id"]
          },
        ]
      }
      job_leases: {
        Row: {
          locked_until: string
          name: string
        }
        Insert: {
          locked_until: string
          name: string
        }
        Update: {
          locked_until?: string
          name?: string
        }
        Relationships: []
      }
      kg_edges: {
        Row: {
          relation: string
          source: string
          target: string
        }
        Insert: {
          relation: string
          source: string
          target: string
        }
        Update: {
          relation?: string
          source?: string
          target?: string
        }
        Relationships: [
          {
            foreignKeyName: "kg_edges_source_fkey"
            columns: ["source"]
            isOneToOne: false
            referencedRelation: "kg_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kg_edges_target_fkey"
            columns: ["target"]
            isOneToOne: false
            referencedRelation: "kg_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      kg_nodes: {
        Row: {
          id: string
          kind: string
          label: string
        }
        Insert: {
          id: string
          kind: string
          label: string
        }
        Update: {
          id?: string
          kind?: string
          label?: string
        }
        Relationships: []
      }
      signal_dispatch_claims: {
        Row: {
          claimed_at: string
          item_id: string
        }
        Insert: {
          claimed_at?: string
          item_id: string
        }
        Update: {
          claimed_at?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signal_dispatch_claims_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "trending_items"
            referencedColumns: ["id"]
          },
        ]
      }
      trending_items: {
        Row: {
          author_avatar: string | null
          author_handle: string
          author_name: string | null
          category: Database["public"]["Enums"]["item_category"]
          created_at: string
          external_url: string
          id: string
          metrics: Json
          submitted_by: string | null
          title_or_snippet: string
          type: Database["public"]["Enums"]["item_type"]
          rank_score: number | null
        }
        Insert: {
          author_avatar?: string | null
          author_handle: string
          author_name?: string | null
          category: Database["public"]["Enums"]["item_category"]
          created_at?: string
          external_url: string
          id?: string
          metrics?: Json
          submitted_by?: string | null
          title_or_snippet: string
          type: Database["public"]["Enums"]["item_type"]
        }
        Update: {
          author_avatar?: string | null
          author_handle?: string
          author_name?: string | null
          category?: Database["public"]["Enums"]["item_category"]
          created_at?: string
          external_url?: string
          id?: string
          metrics?: Json
          submitted_by?: string | null
          title_or_snippet?: string
          type?: Database["public"]["Enums"]["item_type"]
        }
        Relationships: []
      }
      user_bookmarks: {
        Row: {
          created_at: string
          id: string
          item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bookmarks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "trending_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          current_period_end: string | null
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          current_period_end?: string | null
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          current_period_end?: string | null
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          email: string | null
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          email?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          email?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          stripe_subscription_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          stripe_subscription_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          stripe_subscription_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acquire_lease: {
        Args: { p_name: string; p_seconds: number }
        Returns: boolean
      }
      api_authorize: {
        Args: { p_hash: string }
        Returns: {
          allowed: boolean
          lim: number
          remaining: number
          reset_at: string
          status: number
        }[]
      }
      api_plan_limit: { Args: { _uid: string }; Returns: number }
      bookmark_counts: {
        Args: never
        Returns: {
          item_id: string
          saves: number
        }[]
      }
      calculate_engagement_score: {
        Args: {
          created: string
          likes: number
          retweets: number
          views: number
        }
        Returns: number
      }
      claim_signal_dispatch: { Args: { p_item_id: string }; Returns: boolean }
      consume_ai_credit: { Args: never; Returns: number }
      hybrid_search: {
        Args: {
          item_types?: Database["public"]["Enums"]["item_type"][]
          match_count?: number
          query_embedding: string
          query_text: string
          since?: string
        }
        Returns: {
          item_id: string
          score: number
          similarity: number
          text_rank: number
        }[]
      }
      invite_workspace_member: {
        Args: {
          p_email: string
          p_role: Database["public"]["Enums"]["workspace_role"]
          p_ws: string
        }
        Returns: boolean
      }
      is_pro: { Args: { _uid: string }; Returns: boolean }
      rank_score: {
        Args: { "": Database["public"]["Tables"]["trending_items"]["Row"] }
        Returns: {
          error: true
        } & "the function public.rank_score with parameter or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache"
      }
      similar_items: {
        Args: { match_count?: number; p_item_id: string }
        Returns: {
          item_id: string
          similarity: number
        }[]
      }
      workspace_role_of: {
        Args: { _uid: string; _ws: string }
        Returns: Database["public"]["Enums"]["workspace_role"]
      }
    }
    Enums: {
      item_category:
        | "AI & Tech"
        | "SaaS & Startups"
        | "Design & UX"
        | "Finance"
        | "Crypto"
      item_type: "Post" | "Account" | "Community" | "Thread" | "Media"
      plan_tier: "Free" | "Pro" | "Enterprise"
      workspace_role: "owner" | "editor" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      item_category: [
        "AI & Tech",
        "SaaS & Startups",
        "Design & UX",
        "Finance",
        "Crypto",
      ],
      item_type: ["Post", "Account", "Community", "Thread", "Media"],
      plan_tier: ["Free", "Pro", "Enterprise"],
      workspace_role: ["owner", "editor", "viewer"],
    },
  },
} as const
