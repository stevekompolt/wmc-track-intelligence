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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      connected_services: {
        Row: {
          access_token_issued_at: string | null
          connected_by_user_ref: string | null
          created_at: string
          discovery_status: string | null
          discovery_updated_at: string | null
          id: string
          instance_url: string | null
          last_refresh_at: string | null
          last_refresh_error: string | null
          login_url: string | null
          oauth_refresh_token_enc: string | null
          org_id: string | null
          org_name: string | null
          service_key: string
          status: string
          token_refresh_lock_owner: string | null
          token_refresh_locked_until: string | null
          updated_at: string
        }
        Insert: {
          access_token_issued_at?: string | null
          connected_by_user_ref?: string | null
          created_at?: string
          discovery_status?: string | null
          discovery_updated_at?: string | null
          id?: string
          instance_url?: string | null
          last_refresh_at?: string | null
          last_refresh_error?: string | null
          login_url?: string | null
          oauth_refresh_token_enc?: string | null
          org_id?: string | null
          org_name?: string | null
          service_key: string
          status?: string
          token_refresh_lock_owner?: string | null
          token_refresh_locked_until?: string | null
          updated_at?: string
        }
        Update: {
          access_token_issued_at?: string | null
          connected_by_user_ref?: string | null
          created_at?: string
          discovery_status?: string | null
          discovery_updated_at?: string | null
          id?: string
          instance_url?: string | null
          last_refresh_at?: string | null
          last_refresh_error?: string | null
          login_url?: string | null
          oauth_refresh_token_enc?: string | null
          org_id?: string | null
          org_name?: string | null
          service_key?: string
          status?: string
          token_refresh_lock_owner?: string | null
          token_refresh_locked_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      oauth_states: {
        Row: {
          code_verifier: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          nonce: string | null
          provider: string
          redirect_to: string | null
          state: string
          user_ref: string | null
        }
        Insert: {
          code_verifier: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          nonce?: string | null
          provider?: string
          redirect_to?: string | null
          state: string
          user_ref?: string | null
        }
        Update: {
          code_verifier?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          nonce?: string | null
          provider?: string
          redirect_to?: string | null
          state?: string
          user_ref?: string | null
        }
        Relationships: []
      }
      salesforce_schema_cache: {
        Row: {
          created_at: string
          custom: boolean | null
          fetched_at: string
          fields: Json
          id: string
          label: string | null
          namespace: string | null
          object_name: string
          raw: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom?: boolean | null
          fetched_at?: string
          fields?: Json
          id?: string
          label?: string | null
          namespace?: string | null
          object_name: string
          raw?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom?: boolean | null
          fetched_at?: string
          fields?: Json
          id?: string
          label?: string | null
          namespace?: string | null
          object_name?: string
          raw?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      connected_services_public: {
        Row: {
          discovery_status: string | null
          discovery_updated_at: string | null
          instance_url: string | null
          last_refresh_at: string | null
          org_id: string | null
          org_name: string | null
          service_key: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          discovery_status?: string | null
          discovery_updated_at?: string | null
          instance_url?: string | null
          last_refresh_at?: string | null
          org_id?: string | null
          org_name?: string | null
          service_key?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          discovery_status?: string | null
          discovery_updated_at?: string | null
          instance_url?: string | null
          last_refresh_at?: string | null
          org_id?: string | null
          org_name?: string | null
          service_key?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_connected_service_status: {
        Args: { _service_key: string }
        Returns: {
          discovery_status: string
          discovery_updated_at: string
          instance_url: string
          last_refresh_at: string
          org_id: string
          org_name: string
          service_key: string
          status: string
          updated_at: string
        }[]
      }
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
