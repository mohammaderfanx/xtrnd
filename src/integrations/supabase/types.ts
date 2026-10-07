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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      consume_ai_credit: { Args: never; Returns: number }
      is_pro: { Args: { _uid: string }; Returns: boolean }
      rank_score: {
        Args: { "": Database["public"]["Tables"]["trending_items"]["Row"] }
        Returns: {
          error: true
        } & "the function public.rank_score with parameter or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache"
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
    },
  },
} as const
