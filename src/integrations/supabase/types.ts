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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
    },
  },
} as const
