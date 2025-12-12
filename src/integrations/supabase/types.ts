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
      competitor_research_cache: {
        Row: {
          competitors: Json
          created_at: string | null
          expires_at: string | null
          id: string
          input_hash: string
        }
        Insert: {
          competitors: Json
          created_at?: string | null
          expires_at?: string | null
          id?: string
          input_hash: string
        }
        Update: {
          competitors?: Json
          created_at?: string | null
          expires_at?: string | null
          id?: string
          input_hash?: string
        }
        Relationships: []
      }
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
      prospect_discovery_cache: {
        Row: {
          created_at: string | null
          criteria_hash: string
          expires_at: string | null
          id: string
          page_number: number
          prospects: Json
          total_estimate: number | null
        }
        Insert: {
          created_at?: string | null
          criteria_hash: string
          expires_at?: string | null
          id?: string
          page_number: number
          prospects: Json
          total_estimate?: number | null
        }
        Update: {
          created_at?: string | null
          criteria_hash?: string
          expires_at?: string | null
          id?: string
          page_number?: number
          prospects?: Json
          total_estimate?: number | null
        }
        Relationships: []
      }
      prospects: {
        Row: {
          address: string | null
          ai_enrichment_json: Json | null
          contract_value: string | null
          created_at: string | null
          decision_maker: string | null
          enriched_at: string | null
          highlight: string | null
          highlight_type: string | null
          id: string
          lat: number | null
          lng: number | null
          name: string
          phone: string | null
          place_id: string | null
          riplace_angle: string | null
          riplace_score: number | null
          sources: Json | null
          state: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          address?: string | null
          ai_enrichment_json?: Json | null
          contract_value?: string | null
          created_at?: string | null
          decision_maker?: string | null
          enriched_at?: string | null
          highlight?: string | null
          highlight_type?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          phone?: string | null
          place_id?: string | null
          riplace_angle?: string | null
          riplace_score?: number | null
          sources?: Json | null
          state?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          address?: string | null
          ai_enrichment_json?: Json | null
          contract_value?: string | null
          created_at?: string | null
          decision_maker?: string | null
          enriched_at?: string | null
          highlight?: string | null
          highlight_type?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string | null
          place_id?: string | null
          riplace_angle?: string | null
          riplace_score?: number | null
          sources?: Json | null
          state?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      user_categories: {
        Row: {
          category_id: string
          category_name: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          category_id: string
          category_name: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          category_id?: string
          category_name?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_competitors: {
        Row: {
          category_id: string | null
          competitor_name: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          competitor_name: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          competitor_name?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_leads: {
        Row: {
          ai_hook: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          notes: string | null
          prospect_id: string
          status: Database["public"]["Enums"]["lead_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_hook?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          prospect_id: string
          status?: Database["public"]["Enums"]["lead_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_hook?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          prospect_id?: string
          status?: Database["public"]["Enums"]["lead_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_leads_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_prospect_lists: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          prospect_data: Json
          source: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          prospect_data: Json
          source?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          prospect_data?: Json
          source?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_territories: {
        Row: {
          cities: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_custom_territory: boolean | null
          region: string | null
          states: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cities?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_custom_territory?: boolean | null
          region?: string | null
          states?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cities?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_custom_territory?: boolean | null
          region?: string | null
          states?: Json | null
          updated_at?: string | null
          user_id?: string
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
      lead_status:
        | "saved"
        | "contacted"
        | "meeting_booked"
        | "won"
        | "lost"
        | "irrelevant"
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
    Enums: {
      lead_status: [
        "saved",
        "contacted",
        "meeting_booked",
        "won",
        "lost",
        "irrelevant",
      ],
    },
  },
} as const
