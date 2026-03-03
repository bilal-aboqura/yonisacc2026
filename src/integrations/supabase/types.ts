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
      accounts: {
        Row: {
          balance: number | null
          code: string
          company_id: string
          cost_center_id: string | null
          created_at: string
          global_account_id: string | null
          id: string
          is_active: boolean | null
          is_parent: boolean | null
          is_system: boolean | null
          name: string
          name_en: string | null
          parent_id: string | null
          sort_order: number | null
          type: string
        }
        Insert: {
          balance?: number | null
          code: string
          company_id: string
          cost_center_id?: string | null
          created_at?: string
          global_account_id?: string | null
          id?: string
          is_active?: boolean | null
          is_parent?: boolean | null
          is_system?: boolean | null
          name: string
          name_en?: string | null
          parent_id?: string | null
          sort_order?: number | null
          type: string
        }
        Update: {
          balance?: number | null
          code?: string
          company_id?: string
          cost_center_id?: string | null
          created_at?: string
          global_account_id?: string | null
          id?: string
          is_active?: boolean | null
          is_parent?: boolean | null
          is_system?: boolean | null
          name?: string
          name_en?: string | null
          parent_id?: string | null
          sort_order?: number | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_global_account_id_fkey"
            columns: ["global_account_id"]
            isOneToOne: false
            referencedRelation: "global_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          company_id: string | null
          created_at: string
          details: string | null
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          operation_type: string
          record_id: string | null
          request_path: string | null
          severity: string | null
          table_name: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          operation_type: string
          record_id?: string | null
          request_path?: string | null
          severity?: string | null
          table_name: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          operation_type?: string
          record_id?: string | null
          request_path?: string | null
          severity?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_id: string | null
          account_number: string | null
          bank_name: string
          bank_name_en: string | null
          branch_name: string | null
          company_id: string
          created_at: string
          currency: string | null
          current_balance: number | null
          iban: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          opening_balance: number | null
          swift_code: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          account_number?: string | null
          bank_name: string
          bank_name_en?: string | null
          branch_name?: string | null
          company_id: string
          created_at?: string
          currency?: string | null
          current_balance?: number | null
          iban?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          opening_balance?: number | null
          swift_code?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          account_number?: string | null
          bank_name?: string
          bank_name_en?: string | null
          branch_name?: string | null
          company_id?: string
          created_at?: string
          currency?: string | null
          current_balance?: number | null
          iban?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          opening_balance?: number | null
          swift_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
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
      business_verticals: {
        Row: {
          color: string | null
          created_at: string | null
          description_ar: string
          description_en: string
          features_ar: string[] | null
          features_en: string[] | null
          icon: string
          id: string
          is_active: boolean | null
          monthly_price: number
          name_ar: string
          name_en: string
          sort_order: number | null
          status: string
          yearly_price: number
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description_ar: string
          description_en: string
          features_ar?: string[] | null
          features_en?: string[] | null
          icon?: string
          id?: string
          is_active?: boolean | null
          monthly_price?: number
          name_ar: string
          name_en: string
          sort_order?: number | null
          status?: string
          yearly_price?: number
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description_ar?: string
          description_en?: string
          features_ar?: string[] | null
          features_en?: string[] | null
          icon?: string
          id?: string
          is_active?: boolean | null
          monthly_price?: number
          name_ar?: string
          name_en?: string
          sort_order?: number | null
          status?: string
          yearly_price?: number
        }
        Relationships: []
      }
      car_brands: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          name_en: string | null
          sort_order: number | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          name_en?: string | null
          sort_order?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          name_en?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "car_brands_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      car_models: {
        Row: {
          brand_id: string
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          year_from: number | null
          year_to: number | null
        }
        Insert: {
          brand_id: string
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          year_from?: number | null
          year_to?: number | null
        }
        Update: {
          brand_id?: string
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          year_from?: number | null
          year_to?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "car_models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "car_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_models_company_id_fkey"
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
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
      company_feature_overrides: {
        Row: {
          company_id: string
          created_at: string
          custom_override: boolean
          id: string
          max_journal_entries: number | null
          max_purchase_invoices: number | null
          max_sales_invoices: number | null
          max_users: number | null
          module_auto_parts: boolean | null
          module_hr: boolean | null
          module_inventory: boolean | null
          module_purchases: boolean | null
          module_reports: boolean | null
          module_sales: boolean | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          custom_override?: boolean
          id?: string
          max_journal_entries?: number | null
          max_purchase_invoices?: number | null
          max_sales_invoices?: number | null
          max_users?: number | null
          module_auto_parts?: boolean | null
          module_hr?: boolean | null
          module_inventory?: boolean | null
          module_purchases?: boolean | null
          module_reports?: boolean | null
          module_sales?: boolean | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          custom_override?: boolean
          id?: string
          max_journal_entries?: number | null
          max_purchase_invoices?: number | null
          max_sales_invoices?: number | null
          max_users?: number | null
          module_auto_parts?: boolean | null
          module_hr?: boolean | null
          module_inventory?: boolean | null
          module_purchases?: boolean | null
          module_reports?: boolean | null
          module_sales?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_feature_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          invited_by: string | null
          is_active: boolean | null
          joined_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_permission_overrides: {
        Row: {
          allowed: boolean
          company_id: string
          created_at: string
          feature_key: string
          id: string
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          company_id: string
          created_at?: string
          feature_key: string
          id?: string
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          company_id?: string
          created_at?: string
          feature_key?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_permission_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_permission_overrides_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["feature_key"]
          },
        ]
      }
      company_print_settings: {
        Row: {
          bottom_offset: number | null
          company_id: string
          created_at: string
          font_family: string | null
          footer_text: string | null
          id: string
          left_offset: number | null
          letterhead_file_url: string | null
          letterhead_type: string | null
          primary_color: string | null
          right_offset: number | null
          show_commercial_register: boolean
          show_footer: boolean
          show_logo: boolean
          show_opening_balance: boolean
          show_signature: boolean
          show_tax_number: boolean
          signature_url: string | null
          template_style: string | null
          top_offset: number | null
          updated_at: string
        }
        Insert: {
          bottom_offset?: number | null
          company_id: string
          created_at?: string
          font_family?: string | null
          footer_text?: string | null
          id?: string
          left_offset?: number | null
          letterhead_file_url?: string | null
          letterhead_type?: string | null
          primary_color?: string | null
          right_offset?: number | null
          show_commercial_register?: boolean
          show_footer?: boolean
          show_logo?: boolean
          show_opening_balance?: boolean
          show_signature?: boolean
          show_tax_number?: boolean
          signature_url?: string | null
          template_style?: string | null
          top_offset?: number | null
          updated_at?: string
        }
        Update: {
          bottom_offset?: number | null
          company_id?: string
          created_at?: string
          font_family?: string | null
          footer_text?: string | null
          id?: string
          left_offset?: number | null
          letterhead_file_url?: string | null
          letterhead_type?: string | null
          primary_color?: string | null
          right_offset?: number | null
          show_commercial_register?: boolean
          show_footer?: boolean
          show_logo?: boolean
          show_opening_balance?: boolean
          show_signature?: boolean
          show_tax_number?: boolean
          signature_url?: string | null
          template_style?: string | null
          top_offset?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_print_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          cash_account_id: string | null
          company_id: string
          created_at: string
          default_branch_id: string | null
          default_payment_terms: number | null
          default_tax_rate: number | null
          default_warehouse_id: string | null
          id: string
          inventory_account_id: string | null
          invoice_prefix: string | null
          journal_prefix: string | null
          next_invoice_number: number | null
          next_journal_number: number | null
          next_payment_number: number | null
          next_purchase_number: number | null
          next_quote_number: number | null
          next_receipt_number: number | null
          payables_account_id: string | null
          payment_prefix: string | null
          purchase_prefix: string | null
          purchases_account_id: string | null
          quote_prefix: string | null
          receipt_prefix: string | null
          receivables_account_id: string | null
          sales_account_id: string | null
          updated_at: string
          vat_account_id: string | null
        }
        Insert: {
          cash_account_id?: string | null
          company_id: string
          created_at?: string
          default_branch_id?: string | null
          default_payment_terms?: number | null
          default_tax_rate?: number | null
          default_warehouse_id?: string | null
          id?: string
          inventory_account_id?: string | null
          invoice_prefix?: string | null
          journal_prefix?: string | null
          next_invoice_number?: number | null
          next_journal_number?: number | null
          next_payment_number?: number | null
          next_purchase_number?: number | null
          next_quote_number?: number | null
          next_receipt_number?: number | null
          payables_account_id?: string | null
          payment_prefix?: string | null
          purchase_prefix?: string | null
          purchases_account_id?: string | null
          quote_prefix?: string | null
          receipt_prefix?: string | null
          receivables_account_id?: string | null
          sales_account_id?: string | null
          updated_at?: string
          vat_account_id?: string | null
        }
        Update: {
          cash_account_id?: string | null
          company_id?: string
          created_at?: string
          default_branch_id?: string | null
          default_payment_terms?: number | null
          default_tax_rate?: number | null
          default_warehouse_id?: string | null
          id?: string
          inventory_account_id?: string | null
          invoice_prefix?: string | null
          journal_prefix?: string | null
          next_invoice_number?: number | null
          next_journal_number?: number | null
          next_payment_number?: number | null
          next_purchase_number?: number | null
          next_quote_number?: number | null
          next_receipt_number?: number | null
          payables_account_id?: string | null
          payment_prefix?: string | null
          purchase_prefix?: string | null
          purchases_account_id?: string | null
          quote_prefix?: string | null
          receipt_prefix?: string | null
          receivables_account_id?: string | null
          sales_account_id?: string | null
          updated_at?: string
          vat_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_settings_default_branch_id_fkey"
            columns: ["default_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_settings_default_warehouse_id_fkey"
            columns: ["default_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_settings_inventory_account_id_fkey"
            columns: ["inventory_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_settings_payables_account_id_fkey"
            columns: ["payables_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_settings_purchases_account_id_fkey"
            columns: ["purchases_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_settings_receivables_account_id_fkey"
            columns: ["receivables_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_settings_sales_account_id_fkey"
            columns: ["sales_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_settings_vat_account_id_fkey"
            columns: ["vat_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
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
      contacts: {
        Row: {
          account_id: string | null
          address: string | null
          balance: number | null
          city: string | null
          commercial_register: string | null
          company_id: string
          country: string | null
          created_at: string
          credit_limit: number | null
          email: string | null
          id: string
          is_active: boolean | null
          mobile: string | null
          name: string
          name_en: string | null
          notes: string | null
          phone: string | null
          tax_number: string | null
          type: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          address?: string | null
          balance?: number | null
          city?: string | null
          commercial_register?: string | null
          company_id: string
          country?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          mobile?: string | null
          name: string
          name_en?: string | null
          notes?: string | null
          phone?: string | null
          tax_number?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          address?: string | null
          balance?: number | null
          city?: string | null
          commercial_register?: string | null
          company_id?: string
          country?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          mobile?: string | null
          name?: string
          name_en?: string | null
          notes?: string | null
          phone?: string | null
          tax_number?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          code: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          parent_id: string | null
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          parent_id?: string | null
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string
          description_ar: string | null
          feature_key: string
          id: string
          module: string
        }
        Insert: {
          created_at?: string
          description?: string
          description_ar?: string | null
          feature_key: string
          id?: string
          module: string
        }
        Update: {
          created_at?: string
          description?: string
          description_ar?: string | null
          feature_key?: string
          id?: string
          module?: string
        }
        Relationships: []
      }
      fiscal_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          company_id: string
          created_at: string
          end_date: string
          id: string
          is_closed: boolean | null
          name: string
          name_en: string | null
          period_type: string
          start_date: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          company_id: string
          created_at?: string
          end_date: string
          id?: string
          is_closed?: boolean | null
          name: string
          name_en?: string | null
          period_type?: string
          start_date: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          company_id?: string
          created_at?: string
          end_date?: string
          id?: string
          is_closed?: boolean | null
          name?: string
          name_en?: string | null
          period_type?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      global_accounts: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_parent: boolean | null
          name: string
          name_en: string | null
          parent_code: string | null
          sort_order: number | null
          type: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_parent?: boolean | null
          name: string
          name_en?: string | null
          parent_code?: string | null
          sort_order?: number | null
          type: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_parent?: boolean | null
          name?: string
          name_en?: string | null
          parent_code?: string | null
          sort_order?: number | null
          type?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          description: string | null
          discount_amount: number | null
          discount_percent: number | null
          id: string
          invoice_id: string
          product_id: string | null
          quantity: number
          sort_order: number | null
          tax_amount: number | null
          tax_rate: number | null
          total: number | null
          unit_price: number
        }
        Insert: {
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          invoice_id: string
          product_id?: string | null
          quantity?: number
          sort_order?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number | null
          unit_price?: number
        }
        Update: {
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          invoice_id?: string
          product_id?: string | null
          quantity?: number
          sort_order?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          journal_entry_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string | null
          reference_number: string | null
          treasury_transaction_id: string | null
        }
        Insert: {
          amount?: number
          bank_account_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          journal_entry_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          reference_number?: string | null
          treasury_transaction_id?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          journal_entry_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          reference_number?: string | null
          treasury_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payments_treasury_transaction_id_fkey"
            columns: ["treasury_transaction_id"]
            isOneToOne: false
            referencedRelation: "treasury_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          branch_id: string | null
          company_id: string
          contact_id: string | null
          created_at: string
          created_by: string | null
          discount_amount: number | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          journal_entry_id: string | null
          notes: string | null
          paid_amount: number | null
          payment_status: string | null
          reference_number: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          total: number | null
          type: string
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          journal_entry_id?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_status?: string | null
          reference_number?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total?: number | null
          type: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          journal_entry_id?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_status?: string | null
          reference_number?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total?: number | null
          type?: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          entry_date: string
          entry_number: string
          id: string
          is_auto: boolean | null
          posted_at: string | null
          posted_by: string | null
          reference_id: string | null
          reference_type: string | null
          status: string | null
          total_credit: number | null
          total_debit: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          entry_number: string
          id?: string
          is_auto?: boolean | null
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          total_credit?: number | null
          total_debit?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          entry_number?: string
          id?: string
          is_auto?: boolean | null
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          total_credit?: number | null
          total_debit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          cost_center_id: string | null
          credit: number | null
          debit: number | null
          description: string | null
          entry_id: string
          id: string
          sort_order: number | null
        }
        Insert: {
          account_id: string
          cost_center_id?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          entry_id: string
          id?: string
          sort_order?: number | null
        }
        Update: {
          account_id?: string
          cost_center_id?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          entry_id?: string
          id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_faq: {
        Row: {
          answer_ar: string
          answer_en: string
          created_at: string | null
          id: string
          is_active: boolean | null
          question_ar: string
          question_en: string
          sort_order: number | null
        }
        Insert: {
          answer_ar: string
          answer_en: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question_ar: string
          question_en: string
          sort_order?: number | null
        }
        Update: {
          answer_ar?: string
          answer_en?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question_ar?: string
          question_en?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      landing_features: {
        Row: {
          color: string | null
          created_at: string | null
          description_ar: string
          description_en: string
          icon: string
          id: string
          is_active: boolean | null
          sort_order: number | null
          title_ar: string
          title_en: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description_ar: string
          description_en: string
          icon: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title_ar: string
          title_en: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description_ar?: string
          description_en?: string
          icon?: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title_ar?: string
          title_en?: string
        }
        Relationships: []
      }
      landing_hero: {
        Row: {
          badge_ar: string | null
          badge_en: string | null
          cta_text_ar: string
          cta_text_en: string
          demo_text_ar: string | null
          demo_text_en: string | null
          id: string
          is_active: boolean | null
          stat1_label_ar: string | null
          stat1_label_en: string | null
          stat1_value: string | null
          stat2_label_ar: string | null
          stat2_label_en: string | null
          stat2_value: string | null
          stat3_label_ar: string | null
          stat3_label_en: string | null
          stat3_value: string | null
          subtitle_ar: string
          subtitle_en: string
          title_ar: string
          title_en: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          badge_ar?: string | null
          badge_en?: string | null
          cta_text_ar: string
          cta_text_en: string
          demo_text_ar?: string | null
          demo_text_en?: string | null
          id?: string
          is_active?: boolean | null
          stat1_label_ar?: string | null
          stat1_label_en?: string | null
          stat1_value?: string | null
          stat2_label_ar?: string | null
          stat2_label_en?: string | null
          stat2_value?: string | null
          stat3_label_ar?: string | null
          stat3_label_en?: string | null
          stat3_value?: string | null
          subtitle_ar: string
          subtitle_en: string
          title_ar: string
          title_en: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          badge_ar?: string | null
          badge_en?: string | null
          cta_text_ar?: string
          cta_text_en?: string
          demo_text_ar?: string | null
          demo_text_en?: string | null
          id?: string
          is_active?: boolean | null
          stat1_label_ar?: string | null
          stat1_label_en?: string | null
          stat1_value?: string | null
          stat2_label_ar?: string | null
          stat2_label_en?: string | null
          stat2_value?: string | null
          stat3_label_ar?: string | null
          stat3_label_en?: string | null
          stat3_value?: string | null
          subtitle_ar?: string
          subtitle_en?: string
          title_ar?: string
          title_en?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      opening_balances: {
        Row: {
          account_id: string
          company_id: string
          created_at: string | null
          credit: number
          debit: number
          fiscal_year_id: string | null
          id: string
          is_posted: boolean | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          company_id: string
          created_at?: string | null
          credit?: number
          debit?: number
          fiscal_year_id?: string | null
          id?: string
          is_posted?: boolean | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          company_id?: string
          created_at?: string | null
          credit?: number
          debit?: number
          fiscal_year_id?: string | null
          id?: string
          is_posted?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opening_balances_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opening_balances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opening_balances_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          account_id: string | null
          code: string
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          name_en: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          code: string
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          name_en?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          code?: string
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          name_en?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_feature_permissions: {
        Row: {
          allowed: boolean
          created_at: string
          feature_key: string
          id: string
          plan_id: string
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          feature_key: string
          id?: string
          plan_id: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          feature_key?: string
          id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_feature_permissions_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["feature_key"]
          },
          {
            foreignKeyName: "plan_feature_permissions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_permission_bounds: {
        Row: {
          allowed: boolean
          created_at: string
          id: string
          permission_id: string
          plan_id: string
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          id?: string
          permission_id: string
          plan_id: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          id?: string
          permission_id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_permission_bounds_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "rbac_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_permission_bounds_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
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
      price_list_items: {
        Row: {
          created_at: string
          id: string
          min_quantity: number | null
          price: number
          price_list_id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          min_quantity?: number | null
          price?: number
          price_list_id: string
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          min_quantity?: number | null
          price?: number
          price_list_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_list_items_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_list_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      price_lists: {
        Row: {
          company_id: string
          created_at: string
          discount_percent: number | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          name_en: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          name_en?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          name_en?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_lists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_car_compatibility: {
        Row: {
          car_model_id: string
          created_at: string | null
          id: string
          notes: string | null
          product_id: string
        }
        Insert: {
          car_model_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id: string
        }
        Update: {
          car_model_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_car_compatibility_car_model_id_fkey"
            columns: ["car_model_id"]
            isOneToOne: false
            referencedRelation: "car_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_car_compatibility_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          parent_id: string | null
          sort_order: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          parent_id?: string | null
          sort_order?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          parent_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_stock: {
        Row: {
          id: string
          product_id: string
          quantity: number | null
          reserved_quantity: number | null
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          id?: string
          product_id: string
          quantity?: number | null
          reserved_quantity?: number | null
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          id?: string
          product_id?: string
          quantity?: number | null
          reserved_quantity?: number | null
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category_id: string | null
          company_id: string
          created_at: string
          cross_reference: string[] | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_service: boolean | null
          max_stock: number | null
          min_stock: number | null
          name: string
          name_en: string | null
          oem_number: string | null
          part_condition: string | null
          purchase_price: number | null
          sale_price: number | null
          shelf_location: string | null
          sku: string | null
          tax_rate: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          company_id: string
          created_at?: string
          cross_reference?: string[] | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_service?: boolean | null
          max_stock?: number | null
          min_stock?: number | null
          name: string
          name_en?: string | null
          oem_number?: string | null
          part_condition?: string | null
          purchase_price?: number | null
          sale_price?: number | null
          shelf_location?: string | null
          sku?: string | null
          tax_rate?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          company_id?: string
          created_at?: string
          cross_reference?: string[] | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_service?: boolean | null
          max_stock?: number | null
          min_stock?: number | null
          name?: string
          name_en?: string | null
          oem_number?: string | null
          part_condition?: string | null
          purchase_price?: number | null
          sale_price?: number | null
          shelf_location?: string | null
          sku?: string | null
          tax_rate?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          language: string | null
          phone: string | null
          phone_number: string | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          phone?: string | null
          phone_number?: string | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          phone?: string | null
          phone_number?: string | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rbac_permissions: {
        Row: {
          code: string
          created_at: string
          description: string
          description_ar: string | null
          id: string
          module: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string
          description_ar?: string | null
          id?: string
          module: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          description_ar?: string | null
          id?: string
          module?: string
        }
        Relationships: []
      }
      rbac_role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "rbac_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rbac_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "rbac_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_roles: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          is_system: boolean
          name: string
          name_en: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          name_en?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          name_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rbac_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          company_id: string
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          company_id: string
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          company_id?: string
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rbac_user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "rbac_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          from_warehouse_id: string | null
          id: string
          movement_date: string
          movement_type: string
          notes: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          unit_cost: number | null
          warehouse_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          from_warehouse_id?: string | null
          id?: string
          movement_date?: string
          movement_type: string
          notes?: string | null
          product_id: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number | null
          warehouse_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          from_warehouse_id?: string | null
          id?: string
          movement_date?: string
          movement_type?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          description_ar: string | null
          description_en: string | null
          duration_months: number
          features_ar: string[] | null
          features_en: string[] | null
          id: string
          is_active: boolean | null
          max_branches: number | null
          max_entries: number | null
          max_invoices: number | null
          max_journal_entries: number | null
          max_purchase_invoices: number | null
          max_sales_invoices: number | null
          max_users: number | null
          module_auto_parts: boolean
          module_hr: boolean
          module_inventory: boolean
          module_purchases: boolean
          module_reports: boolean
          module_sales: boolean
          name_ar: string
          name_en: string
          not_included_ar: string[] | null
          not_included_en: string[] | null
          price: number
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          duration_months?: number
          features_ar?: string[] | null
          features_en?: string[] | null
          id?: string
          is_active?: boolean | null
          max_branches?: number | null
          max_entries?: number | null
          max_invoices?: number | null
          max_journal_entries?: number | null
          max_purchase_invoices?: number | null
          max_sales_invoices?: number | null
          max_users?: number | null
          module_auto_parts?: boolean
          module_hr?: boolean
          module_inventory?: boolean
          module_purchases?: boolean
          module_reports?: boolean
          module_sales?: boolean
          name_ar: string
          name_en: string
          not_included_ar?: string[] | null
          not_included_en?: string[] | null
          price?: number
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          duration_months?: number
          features_ar?: string[] | null
          features_en?: string[] | null
          id?: string
          is_active?: boolean | null
          max_branches?: number | null
          max_entries?: number | null
          max_invoices?: number | null
          max_journal_entries?: number | null
          max_purchase_invoices?: number | null
          max_sales_invoices?: number | null
          max_users?: number | null
          module_auto_parts?: boolean
          module_hr?: boolean
          module_inventory?: boolean
          module_purchases?: boolean
          module_reports?: boolean
          module_sales?: boolean
          name_ar?: string
          name_en?: string
          not_included_ar?: string[] | null
          not_included_en?: string[] | null
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
      treasury_transactions: {
        Row: {
          account_id: string | null
          amount: number
          company_id: string
          contact_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          invoice_id: string | null
          journal_entry_id: string | null
          payment_method: string | null
          reference_number: string | null
          status: string | null
          transaction_date: string
          transaction_number: string
          transfer_account_id: string | null
          type: string
        }
        Insert: {
          account_id?: string | null
          amount?: number
          company_id: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          payment_method?: string | null
          reference_number?: string | null
          status?: string | null
          transaction_date?: string
          transaction_number: string
          transfer_account_id?: string | null
          type: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          company_id?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          payment_method?: string | null
          reference_number?: string | null
          status?: string | null
          transaction_date?: string
          transaction_number?: string
          transfer_account_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "treasury_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_transactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_transactions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_transactions_transfer_account_id_fkey"
            columns: ["transfer_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          symbol: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          symbol?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          symbol?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_tracking: {
        Row: {
          company_id: string
          id: string
          journal_entries_count: number
          month: number
          purchase_invoices_count: number
          sales_invoices_count: number
          updated_at: string
          year: number
        }
        Insert: {
          company_id: string
          id?: string
          journal_entries_count?: number
          month: number
          purchase_invoices_count?: number
          sales_invoices_count?: number
          updated_at?: string
          year: number
        }
        Update: {
          company_id?: string
          id?: string
          journal_entries_count?: number
          month?: number
          purchase_invoices_count?: number
          sales_invoices_count?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      vertical_screens: {
        Row: {
          created_at: string | null
          id: string
          screen_id: string
          vertical_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          screen_id: string
          vertical_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          screen_id?: string
          vertical_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vertical_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "system_screens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vertical_screens_vertical_id_fkey"
            columns: ["vertical_id"]
            isOneToOne: false
            referencedRelation: "business_verticals"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          branch_id: string | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean | null
          is_main: boolean | null
          name: string
          name_en: string | null
        }
        Insert: {
          address?: string | null
          branch_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_main?: boolean | null
          name: string
          name_en?: string | null
        }
        Update: {
          address?: string | null
          branch_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_main?: boolean | null
          name?: string
          name_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_permission: {
        Args: { p_company_id: string; p_feature_key: string }
        Returns: Json
      }
      check_usage_limit: {
        Args: { p_company_id: string; p_usage_type: string }
        Returns: Json
      }
      create_default_chart_of_accounts: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      generate_opening_balances_from_closing: {
        Args: {
          p_closing_fiscal_year_id: string
          p_company_id: string
          p_new_fiscal_year_id: string
        }
        Returns: undefined
      }
      get_account_balances: { Args: { p_company_id: string }; Returns: Json }
      get_company_features: { Args: { p_company_id: string }; Returns: Json }
      get_company_permissions: { Args: { p_company_id: string }; Returns: Json }
      get_company_usage: { Args: { p_company_id: string }; Returns: Json }
      get_ledger: {
        Args: {
          p_account_id: string
          p_company_id: string
          p_date_from?: string
          p_date_to?: string
        }
        Returns: Json
      }
      get_plan_permissions_for_company: {
        Args: { p_company_id: string }
        Returns: Json
      }
      get_trial_balance: {
        Args: { p_company_id: string; p_date_from?: string; p_date_to?: string }
        Returns: Json
      }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      get_user_permissions: {
        Args: { _company_id: string; _user_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_usage: {
        Args: { p_company_id: string; p_usage_type: string }
        Returns: undefined
      }
      is_company_owner: { Args: { _company_id: string }; Returns: boolean }
      log_access_denied: {
        Args: {
          _attempted_operation: string
          _attempted_record_id?: string
          _details?: string
          _table_name: string
        }
        Returns: undefined
      }
      log_audit_event: {
        Args: {
          _company_id: string
          _details?: string
          _new_data?: Json
          _old_data?: Json
          _operation_type: string
          _record_id?: string
          _severity?: string
          _table_name: string
        }
        Returns: undefined
      }
      post_invoice_payment: {
        Args: {
          p_amount: number
          p_company_id: string
          p_created_by?: string
          p_invoice_id: string
          p_notes?: string
          p_payment_date?: string
          p_payment_method?: string
          p_reference_number?: string
        }
        Returns: Json
      }
      post_journal_entry: {
        Args: {
          p_company_id: string
          p_created_by: string
          p_description: string
          p_entry_date: string
          p_entry_number: string
          p_lines: Json
          p_status: string
        }
        Returns: string
      }
      post_purchase_invoice: {
        Args: { p_company_id: string; p_invoice_id: string }
        Returns: Json
      }
      post_sales_invoice: {
        Args: { p_company_id: string; p_invoice_id: string }
        Returns: Json
      }
      post_treasury_transaction: {
        Args: {
          p_amount: number
          p_company_id: string
          p_contact_id?: string
          p_created_by?: string
          p_description?: string
          p_invoice_id?: string
          p_payment_method?: string
          p_reference_number?: string
          p_transaction_date: string
          p_transaction_number: string
          p_transfer_account_id?: string
          p_treasury_account_id: string
          p_type: string
        }
        Returns: Json
      }
      provision_tenant: {
        Args: {
          p_activity_type?: string
          p_address?: string
          p_commercial_register?: string
          p_email?: string
          p_name: string
          p_name_en?: string
          p_phone?: string
          p_plan_id?: string
          p_tax_number?: string
          p_user_id: string
        }
        Returns: string
      }
      reset_company_data: { Args: { p_company_id: string }; Returns: undefined }
      return_purchase_invoice: {
        Args: {
          p_company_id: string
          p_invoice_id: string
          p_return_items: Json
        }
        Returns: Json
      }
      return_sales_invoice: {
        Args: {
          p_company_id: string
          p_invoice_id: string
          p_return_items: Json
        }
        Returns: Json
      }
      reverse_treasury_transaction: {
        Args: { p_company_id: string; p_transaction_id: string }
        Returns: Json
      }
      sync_plan_screens_to_subscribers: {
        Args: { p_plan_id: string }
        Returns: undefined
      }
      user_has_permission: {
        Args: {
          _company_id: string
          _permission_code: string
          _user_id: string
        }
        Returns: boolean
      }
      verify_tenant_access: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "client" | "accountant" | "sales" | "hr"
      invoice_type: "sales" | "purchase" | "quote"
      leave_type: "annual" | "sick" | "unpaid" | "emergency"
      penalty_type: "warning" | "deduction" | "suspension"
      subscription_status:
        | "pending"
        | "active"
        | "expired"
        | "cancelled"
        | "trialing"
        | "suspended"
        | "terminated"
        | "past_due"
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
      subscription_status: [
        "pending",
        "active",
        "expired",
        "cancelled",
        "trialing",
        "suspended",
        "terminated",
        "past_due",
      ],
      transaction_type: ["debit", "credit"],
    },
  },
} as const
