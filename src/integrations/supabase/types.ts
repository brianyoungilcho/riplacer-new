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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          company_name: string | null
          company_website: string | null
          competitor_names: string[] | null
          created_at: string | null
          id: string
          onboarding_complete: boolean | null
          onboarding_data: Json | null
          product_description: string | null
          selling_proposition: string | null
          updated_at: string | null
        }
        Insert: {
          company_name?: string | null
          company_website?: string | null
          competitor_names?: string[] | null
          created_at?: string | null
          id: string
          onboarding_complete?: boolean | null
          onboarding_data?: Json | null
          product_description?: string | null
          selling_proposition?: string | null
          updated_at?: string | null
        }
        Update: {
          company_name?: string | null
          company_website?: string | null
          competitor_names?: string[] | null
          created_at?: string | null
          id?: string
          onboarding_complete?: boolean | null
          onboarding_data?: Json | null
          product_description?: string | null
          selling_proposition?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      research_reports: {
        Row: {
          content: Json
          generated_at: string | null
          id: string
          perplexity_tokens_used: number | null
          request_id: string
          sources: Json | null
          summary: string | null
          user_id: string | null
        }
        Insert: {
          content: Json
          generated_at?: string | null
          id?: string
          perplexity_tokens_used?: number | null
          request_id: string
          sources?: Json | null
          summary?: string | null
          user_id?: string | null
        }
        Update: {
          content?: Json
          generated_at?: string | null
          id?: string
          perplexity_tokens_used?: number | null
          request_id?: string
          sources?: Json | null
          summary?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "research_reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "research_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      research_requests: {
        Row: {
          additional_context: string | null
          company_domain: string | null
          company_name: string | null
          competitors: Json | null
          created_at: string | null
          id: string
          product_description: string
          research_completed_at: string | null
          research_started_at: string | null
          status: string | null
          target_account: string
          target_categories: Json | null
          territory_states: Json | null
          user_id: string | null
        }
        Insert: {
          additional_context?: string | null
          company_domain?: string | null
          company_name?: string | null
          competitors?: Json | null
          created_at?: string | null
          id?: string
          product_description: string
          research_completed_at?: string | null
          research_started_at?: string | null
          status?: string | null
          target_account: string
          target_categories?: Json | null
          territory_states?: Json | null
          user_id?: string | null
        }
        Update: {
          additional_context?: string | null
          company_domain?: string | null
          company_name?: string | null
          competitors?: Json | null
          created_at?: string | null
          id?: string
          product_description?: string
          research_completed_at?: string | null
          research_started_at?: string | null
          status?: string | null
          target_account?: string
          target_categories?: Json | null
          territory_states?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
