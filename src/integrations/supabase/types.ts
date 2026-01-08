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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      branches: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean | null
          is_main: boolean | null
          name: string
          name_en: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_main?: boolean | null
          name: string
          name_en?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_main?: boolean | null
          name?: string
          name_en?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_screens: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_enabled: boolean | null
          screen_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          screen_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          screen_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_screens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "system_screens"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          activity_type: string | null
          address: string | null
          commercial_register: string | null
          created_at: string
          currency: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          name_en: string | null
          owner_id: string
          phone: string | null
          tax_number: string | null
          updated_at: string
        }
        Insert: {
          activity_type?: string | null
          address?: string | null
          commercial_register?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          name_en?: string | null
          owner_id: string
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Update: {
          activity_type?: string | null
          address?: string | null
          commercial_register?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          name_en?: string | null
          owner_id?: string
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean | null
          message: string
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean | null
          message: string
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean | null
          message?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      plan_screens: {
        Row: {
          created_at: string
          id: string
          plan_id: string
          screen_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_id: string
          screen_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_id?: string
          screen_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_screens_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "system_screens"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          language: string | null
          phone: string | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          language?: string | null
          phone?: string | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          language?: string | null
          phone?: string | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          description_ar: string | null
          description_en: string | null
          duration_months: number
          id: string
          is_active: boolean | null
          max_branches: number | null
          max_entries: number | null
          max_invoices: number | null
          max_users: number | null
          name_ar: string
          name_en: string
          price: number
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          duration_months?: number
          id?: string
          is_active?: boolean | null
          max_branches?: number | null
          max_entries?: number | null
          max_invoices?: number | null
          max_users?: number | null
          name_ar: string
          name_en: string
          price?: number
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          duration_months?: number
          id?: string
          is_active?: boolean | null
          max_branches?: number | null
          max_entries?: number | null
          max_invoices?: number | null
          max_users?: number | null
          name_ar?: string
          name_en?: string
          price?: number
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          company_id: string
          created_at: string
          end_date: string | null
          entries_used: number | null
          id: string
          invoices_used: number | null
          notes: string | null
          payment_date: string | null
          payment_reference: string | null
          plan_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          end_date?: string | null
          entries_used?: number | null
          id?: string
          invoices_used?: number | null
          notes?: string | null
          payment_date?: string | null
          payment_reference?: string | null
          plan_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          end_date?: string | null
          entries_used?: number | null
          id?: string
          invoices_used?: number | null
          notes?: string | null
          payment_date?: string | null
          payment_reference?: string | null
          plan_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      system_screens: {
        Row: {
          created_at: string
          description_ar: string | null
          description_en: string | null
          icon: string | null
          id: string
          key: string
          module: string
          name_ar: string
          name_en: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          icon?: string | null
          id?: string
          key: string
          module: string
          name_ar: string
          name_en: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          icon?: string | null
          id?: string
          key?: string
          module?: string
          name_ar?: string
          name_en?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          avatar_url: string | null
          company: string | null
          content_ar: string
          content_en: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          rating: number | null
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          content_ar: string
          content_en: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          rating?: number | null
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          content_ar?: string
          content_en?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          rating?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "client" | "accountant" | "sales" | "hr"
      invoice_type: "sales" | "purchase" | "quote"
      leave_type: "annual" | "sick" | "unpaid" | "emergency"
      penalty_type: "warning" | "deduction" | "suspension"
      subscription_status: "pending" | "active" | "expired" | "cancelled"
      transaction_type: "debit" | "credit"
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
      app_role: ["owner", "admin", "client", "accountant", "sales", "hr"],
      invoice_type: ["sales", "purchase", "quote"],
      leave_type: ["annual", "sick", "unpaid", "emergency"],
      penalty_type: ["warning", "deduction", "suspension"],
      subscription_status: ["pending", "active", "expired", "cancelled"],
      transaction_type: ["debit", "credit"],
    },
  },
} as const
