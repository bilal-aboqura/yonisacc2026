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
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          chief_complaint: string | null
          company_id: string
          created_at: string | null
          diagnosis: string | null
          doctor_id: string
          duration_minutes: number | null
          follow_up_date: string | null
          id: string
          notes: string | null
          patient_id: string
          status: string | null
          treatment_notes: string | null
          updated_at: string | null
          visit_type: string | null
          vital_signs: Json | null
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          chief_complaint?: string | null
          company_id: string
          created_at?: string | null
          diagnosis?: string | null
          doctor_id: string
          duration_minutes?: number | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          status?: string | null
          treatment_notes?: string | null
          updated_at?: string | null
          visit_type?: string | null
          vital_signs?: Json | null
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          chief_complaint?: string | null
          company_id?: string
          created_at?: string | null
          diagnosis?: string | null
          doctor_id?: string
          duration_minutes?: number | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          status?: string | null
          treatment_notes?: string | null
          updated_at?: string | null
          visit_type?: string | null
          vital_signs?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_categories: {
        Row: {
          company_id: string
          created_at: string | null
          default_salvage_percentage: number | null
          default_useful_life_months: number | null
          depreciation_method: string
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          default_salvage_percentage?: number | null
          default_useful_life_months?: number | null
          depreciation_method?: string
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          default_salvage_percentage?: number | null
          default_useful_life_months?: number | null
          depreciation_method?: string
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_depreciation_entries: {
        Row: {
          accumulated_amount: number
          asset_id: string
          book_value: number
          company_id: string
          created_at: string | null
          depreciation_amount: number
          id: string
          is_posted: boolean | null
          journal_entry_id: string | null
          period_date: string
        }
        Insert: {
          accumulated_amount: number
          asset_id: string
          book_value: number
          company_id: string
          created_at?: string | null
          depreciation_amount: number
          id?: string
          is_posted?: boolean | null
          journal_entry_id?: string | null
          period_date: string
        }
        Update: {
          accumulated_amount?: number
          asset_id?: string
          book_value?: number
          company_id?: string
          created_at?: string | null
          depreciation_amount?: number
          id?: string
          is_posted?: boolean | null
          journal_entry_id?: string | null
          period_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_depreciation_entries_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "fixed_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_depreciation_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_depreciation_entries_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_maintenance_records: {
        Row: {
          asset_id: string
          company_id: string
          cost: number | null
          created_at: string | null
          description: string
          id: string
          maintenance_date: string
          maintenance_type: string
          next_maintenance_date: string | null
          notes: string | null
          performed_by: string | null
        }
        Insert: {
          asset_id: string
          company_id: string
          cost?: number | null
          created_at?: string | null
          description: string
          id?: string
          maintenance_date: string
          maintenance_type?: string
          next_maintenance_date?: string | null
          notes?: string | null
          performed_by?: string | null
        }
        Update: {
          asset_id?: string
          company_id?: string
          cost?: number | null
          created_at?: string | null
          description?: string
          id?: string
          maintenance_date?: string
          maintenance_type?: string
          next_maintenance_date?: string | null
          notes?: string | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_maintenance_records_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "fixed_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_maintenance_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      bill_of_materials: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean | null
          notes: string | null
          product_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          product_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_of_materials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_of_materials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      bom_items: {
        Row: {
          bom_id: string
          id: string
          product_id: string
          quantity: number
          unit_id: string | null
        }
        Insert: {
          bom_id: string
          id?: string
          product_id: string
          quantity?: number
          unit_id?: string | null
        }
        Update: {
          bom_id?: string
          id?: string
          product_id?: string
          quantity?: number
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bom_items_bom_id_fkey"
            columns: ["bom_id"]
            isOneToOne: false
            referencedRelation: "bill_of_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_account_settings: {
        Row: {
          branch_id: string
          cogs_account_id: string | null
          company_id: string
          consumption_expense_account_id: string | null
          created_at: string
          id: string
          inventory_account_id: string | null
          inventory_gain_account_id: string | null
          inventory_loss_account_id: string | null
          module_type: string
          purchase_discount_account_id: string | null
          purchase_expense_account_id: string | null
          purchase_payable_account_id: string | null
          purchase_tax_account_id: string | null
          sales_discount_account_id: string | null
          sales_receivable_account_id: string | null
          sales_revenue_account_id: string | null
          sales_tax_account_id: string | null
          updated_at: string
          wip_account_id: string | null
        }
        Insert: {
          branch_id: string
          cogs_account_id?: string | null
          company_id: string
          consumption_expense_account_id?: string | null
          created_at?: string
          id?: string
          inventory_account_id?: string | null
          inventory_gain_account_id?: string | null
          inventory_loss_account_id?: string | null
          module_type: string
          purchase_discount_account_id?: string | null
          purchase_expense_account_id?: string | null
          purchase_payable_account_id?: string | null
          purchase_tax_account_id?: string | null
          sales_discount_account_id?: string | null
          sales_receivable_account_id?: string | null
          sales_revenue_account_id?: string | null
          sales_tax_account_id?: string | null
          updated_at?: string
          wip_account_id?: string | null
        }
        Update: {
          branch_id?: string
          cogs_account_id?: string | null
          company_id?: string
          consumption_expense_account_id?: string | null
          created_at?: string
          id?: string
          inventory_account_id?: string | null
          inventory_gain_account_id?: string | null
          inventory_loss_account_id?: string | null
          module_type?: string
          purchase_discount_account_id?: string | null
          purchase_expense_account_id?: string | null
          purchase_payable_account_id?: string | null
          purchase_tax_account_id?: string | null
          sales_discount_account_id?: string | null
          sales_receivable_account_id?: string | null
          sales_revenue_account_id?: string | null
          sales_tax_account_id?: string | null
          updated_at?: string
          wip_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_account_settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_account_settings_cogs_account_id_fkey"
            columns: ["cogs_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_account_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_account_settings_consumption_expense_account_id_fkey"
            columns: ["consumption_expense_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_account_settings_inventory_account_id_fkey"
            columns: ["inventory_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_account_settings_inventory_gain_account_id_fkey"
            columns: ["inventory_gain_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_account_settings_inventory_loss_account_id_fkey"
            columns: ["inventory_loss_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_account_settings_purchase_discount_account_id_fkey"
            columns: ["purchase_discount_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_account_settings_purchase_expense_account_id_fkey"
            columns: ["purchase_expense_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_account_settings_purchase_payable_account_id_fkey"
            columns: ["purchase_payable_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_account_settings_purchase_tax_account_id_fkey"
            columns: ["purchase_tax_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_account_settings_sales_discount_account_id_fkey"
            columns: ["sales_discount_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_account_settings_sales_receivable_account_id_fkey"
            columns: ["sales_receivable_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_account_settings_sales_revenue_account_id_fkey"
            columns: ["sales_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_account_settings_sales_tax_account_id_fkey"
            columns: ["sales_tax_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_account_settings_wip_account_id_fkey"
            columns: ["wip_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_payment_methods: {
        Row: {
          branch_id: string
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          payment_method_id: string
        }
        Insert: {
          branch_id: string
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          payment_method_id: string
        }
        Update: {
          branch_id?: string
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          payment_method_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_payment_methods_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_payment_methods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_payment_methods_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
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
      clinic_account_settings: {
        Row: {
          bank_account_id: string | null
          cash_account_id: string | null
          company_id: string
          created_at: string | null
          id: string
          insurance_receivable_account_id: string | null
          medical_revenue_account_id: string | null
          patient_receivable_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          bank_account_id?: string | null
          cash_account_id?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          insurance_receivable_account_id?: string | null
          medical_revenue_account_id?: string | null
          patient_receivable_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          bank_account_id?: string | null
          cash_account_id?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          insurance_receivable_account_id?: string | null
          medical_revenue_account_id?: string | null
          patient_receivable_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_account_settings_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_account_settings_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_account_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_account_settings_insurance_receivable_account_id_fkey"
            columns: ["insurance_receivable_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_account_settings_medical_revenue_account_id_fkey"
            columns: ["medical_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_account_settings_patient_receivable_account_id_fkey"
            columns: ["patient_receivable_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_invoice_items: {
        Row: {
          description: string
          id: string
          invoice_id: string
          quantity: number | null
          total: number | null
          unit_price: number | null
        }
        Insert: {
          description: string
          id?: string
          invoice_id: string
          quantity?: number | null
          total?: number | null
          unit_price?: number | null
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number | null
          total?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "clinic_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_invoices: {
        Row: {
          appointment_id: string | null
          company_id: string
          created_at: string | null
          discount_amount: number | null
          doctor_id: string | null
          id: string
          insurance_amount: number | null
          insurance_status: string | null
          invoice_date: string
          invoice_number: string
          journal_entry_id: string | null
          notes: string | null
          paid_amount: number | null
          patient_id: string
          payment_method: string | null
          payment_status: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          company_id: string
          created_at?: string | null
          discount_amount?: number | null
          doctor_id?: string | null
          id?: string
          insurance_amount?: number | null
          insurance_status?: string | null
          invoice_date?: string
          invoice_number: string
          journal_entry_id?: string | null
          notes?: string | null
          paid_amount?: number | null
          patient_id: string
          payment_method?: string | null
          payment_status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          company_id?: string
          created_at?: string | null
          discount_amount?: number | null
          doctor_id?: string | null
          id?: string
          insurance_amount?: number | null
          insurance_status?: string | null
          invoice_date?: string
          invoice_number?: string
          journal_entry_id?: string | null
          notes?: string | null
          paid_amount?: number | null
          patient_id?: string
          payment_method?: string | null
          payment_status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_invoices_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_invoices_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
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
          allowed_modules: string[] | null
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
          allowed_modules?: string[] | null
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
          allowed_modules?: string[] | null
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
      delivery_account_settings: {
        Row: {
          bank_account_id: string | null
          cash_account_id: string | null
          company_id: string
          created_at: string | null
          customer_receivable_account_id: string | null
          delivery_commission_expense_account_id: string | null
          delivery_revenue_account_id: string | null
          driver_payable_account_id: string | null
          id: string
          sales_return_account_id: string | null
          sales_revenue_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          bank_account_id?: string | null
          cash_account_id?: string | null
          company_id: string
          created_at?: string | null
          customer_receivable_account_id?: string | null
          delivery_commission_expense_account_id?: string | null
          delivery_revenue_account_id?: string | null
          driver_payable_account_id?: string | null
          id?: string
          sales_return_account_id?: string | null
          sales_revenue_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          bank_account_id?: string | null
          cash_account_id?: string | null
          company_id?: string
          created_at?: string | null
          customer_receivable_account_id?: string | null
          delivery_commission_expense_account_id?: string | null
          delivery_revenue_account_id?: string | null
          driver_payable_account_id?: string | null
          id?: string
          sales_return_account_id?: string | null
          sales_revenue_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_account_settings_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_account_settings_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_account_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_account_settings_customer_receivable_account_id_fkey"
            columns: ["customer_receivable_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_account_settings_delivery_commission_expense_acco_fkey"
            columns: ["delivery_commission_expense_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_account_settings_delivery_revenue_account_id_fkey"
            columns: ["delivery_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_account_settings_driver_payable_account_id_fkey"
            columns: ["driver_payable_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_account_settings_sales_return_account_id_fkey"
            columns: ["sales_return_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_account_settings_sales_revenue_account_id_fkey"
            columns: ["sales_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_areas: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string | null
          delivery_fee: number | null
          estimated_time_minutes: number | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string | null
          delivery_fee?: number | null
          estimated_time_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string | null
          delivery_fee?: number | null
          estimated_time_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_areas_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_areas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_drivers: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string | null
          id: string
          name: string
          name_en: string | null
          notes: string | null
          phone: string | null
          status: string
          updated_at: string | null
          vehicle_plate: string | null
          vehicle_type: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          name: string
          name_en?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          name?: string
          name_en?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_drivers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_drivers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_orders: {
        Row: {
          area_id: string | null
          branch_id: string | null
          company_id: string
          created_at: string | null
          customer_name: string
          customer_phone: string | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_fee: number | null
          driver_commission: number | null
          driver_id: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          order_date: string
          order_number: string
          order_total: number | null
          payment_method_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          area_id?: string | null
          branch_id?: string | null
          company_id: string
          created_at?: string | null
          customer_name: string
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          driver_commission?: number | null
          driver_id?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          order_date?: string
          order_number: string
          order_total?: number | null
          payment_method_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          area_id?: string | null
          branch_id?: string | null
          company_id?: string
          created_at?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          driver_commission?: number | null
          driver_id?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          order_date?: string
          order_number?: string
          order_total?: number | null
          payment_method_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_orders_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "delivery_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_orders_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          company_id: string
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          license_number: string | null
          name: string
          name_en: string | null
          phone: string | null
          specialization: string | null
          specialization_en: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          license_number?: string | null
          name: string
          name_en?: string | null
          phone?: string | null
          specialization?: string | null
          specialization_en?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          license_number?: string | null
          name?: string
          name_en?: string | null
          phone?: string | null
          specialization?: string | null
          specialization_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      fixed_asset_account_settings: {
        Row: {
          accumulated_depreciation_account_id: string | null
          asset_account_id: string | null
          company_id: string
          created_at: string | null
          depreciation_expense_account_id: string | null
          disposal_gain_account_id: string | null
          disposal_loss_account_id: string | null
          id: string
          maintenance_expense_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          accumulated_depreciation_account_id?: string | null
          asset_account_id?: string | null
          company_id: string
          created_at?: string | null
          depreciation_expense_account_id?: string | null
          disposal_gain_account_id?: string | null
          disposal_loss_account_id?: string | null
          id?: string
          maintenance_expense_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          accumulated_depreciation_account_id?: string | null
          asset_account_id?: string | null
          company_id?: string
          created_at?: string | null
          depreciation_expense_account_id?: string | null
          disposal_gain_account_id?: string | null
          disposal_loss_account_id?: string | null
          id?: string
          maintenance_expense_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fixed_asset_account_settings_accumulated_depreciation_acco_fkey"
            columns: ["accumulated_depreciation_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_asset_account_settings_asset_account_id_fkey"
            columns: ["asset_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_asset_account_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_asset_account_settings_depreciation_expense_account__fkey"
            columns: ["depreciation_expense_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_asset_account_settings_disposal_gain_account_id_fkey"
            columns: ["disposal_gain_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_asset_account_settings_disposal_loss_account_id_fkey"
            columns: ["disposal_loss_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_asset_account_settings_maintenance_expense_account_i_fkey"
            columns: ["maintenance_expense_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_assets: {
        Row: {
          accumulated_depreciation_account_id: string | null
          asset_account_id: string | null
          asset_code: string
          barcode: string | null
          branch_id: string | null
          category_id: string | null
          company_id: string
          created_at: string | null
          depreciation_account_id: string | null
          depreciation_method: string
          description: string | null
          disposal_amount: number | null
          disposal_date: string | null
          disposal_reason: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          location: string | null
          name: string
          name_en: string | null
          notes: string | null
          purchase_cost: number
          purchase_date: string
          salvage_value: number | null
          serial_number: string | null
          status: string
          supplier_contact_id: string | null
          updated_at: string | null
          useful_life_months: number
          warranty_expiry: string | null
        }
        Insert: {
          accumulated_depreciation_account_id?: string | null
          asset_account_id?: string | null
          asset_code: string
          barcode?: string | null
          branch_id?: string | null
          category_id?: string | null
          company_id: string
          created_at?: string | null
          depreciation_account_id?: string | null
          depreciation_method?: string
          description?: string | null
          disposal_amount?: number | null
          disposal_date?: string | null
          disposal_reason?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          location?: string | null
          name: string
          name_en?: string | null
          notes?: string | null
          purchase_cost: number
          purchase_date: string
          salvage_value?: number | null
          serial_number?: string | null
          status?: string
          supplier_contact_id?: string | null
          updated_at?: string | null
          useful_life_months?: number
          warranty_expiry?: string | null
        }
        Update: {
          accumulated_depreciation_account_id?: string | null
          asset_account_id?: string | null
          asset_code?: string
          barcode?: string | null
          branch_id?: string | null
          category_id?: string | null
          company_id?: string
          created_at?: string | null
          depreciation_account_id?: string | null
          depreciation_method?: string
          description?: string | null
          disposal_amount?: number | null
          disposal_date?: string | null
          disposal_reason?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          location?: string | null
          name?: string
          name_en?: string | null
          notes?: string | null
          purchase_cost?: number
          purchase_date?: string
          salvage_value?: number | null
          serial_number?: string | null
          status?: string
          supplier_contact_id?: string | null
          updated_at?: string | null
          useful_life_months?: number
          warranty_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fixed_assets_accumulated_depreciation_account_id_fkey"
            columns: ["accumulated_depreciation_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_asset_account_id_fkey"
            columns: ["asset_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_depreciation_account_id_fkey"
            columns: ["depreciation_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_supplier_contact_id_fkey"
            columns: ["supplier_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
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
      gold_account_settings: {
        Row: {
          company_id: string
          created_at: string | null
          gold_cogs_account_id: string | null
          gold_inventory_account_id: string | null
          gold_payable_account_id: string | null
          gold_purchase_expense_account_id: string | null
          gold_purchase_tax_account_id: string | null
          gold_receivable_account_id: string | null
          gold_sales_revenue_account_id: string | null
          gold_sales_tax_account_id: string | null
          id: string
          making_cost_revenue_account_id: string | null
          stone_cost_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          gold_cogs_account_id?: string | null
          gold_inventory_account_id?: string | null
          gold_payable_account_id?: string | null
          gold_purchase_expense_account_id?: string | null
          gold_purchase_tax_account_id?: string | null
          gold_receivable_account_id?: string | null
          gold_sales_revenue_account_id?: string | null
          gold_sales_tax_account_id?: string | null
          id?: string
          making_cost_revenue_account_id?: string | null
          stone_cost_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          gold_cogs_account_id?: string | null
          gold_inventory_account_id?: string | null
          gold_payable_account_id?: string | null
          gold_purchase_expense_account_id?: string | null
          gold_purchase_tax_account_id?: string | null
          gold_receivable_account_id?: string | null
          gold_sales_revenue_account_id?: string | null
          gold_sales_tax_account_id?: string | null
          id?: string
          making_cost_revenue_account_id?: string | null
          stone_cost_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gold_account_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gold_account_settings_gold_cogs_account_id_fkey"
            columns: ["gold_cogs_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gold_account_settings_gold_inventory_account_id_fkey"
            columns: ["gold_inventory_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gold_account_settings_gold_payable_account_id_fkey"
            columns: ["gold_payable_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gold_account_settings_gold_purchase_expense_account_id_fkey"
            columns: ["gold_purchase_expense_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gold_account_settings_gold_purchase_tax_account_id_fkey"
            columns: ["gold_purchase_tax_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gold_account_settings_gold_receivable_account_id_fkey"
            columns: ["gold_receivable_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gold_account_settings_gold_sales_revenue_account_id_fkey"
            columns: ["gold_sales_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gold_account_settings_gold_sales_tax_account_id_fkey"
            columns: ["gold_sales_tax_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gold_account_settings_making_cost_revenue_account_id_fkey"
            columns: ["making_cost_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gold_account_settings_stone_cost_account_id_fkey"
            columns: ["stone_cost_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      gold_items: {
        Row: {
          barcode: string | null
          company_id: string
          created_at: string
          gold_cost: number
          id: string
          is_active: boolean
          item_type: string
          karat: string
          making_cost: number
          name: string
          name_en: string | null
          product_id: string | null
          stone_cost: number
          updated_at: string
          weight_grams: number
        }
        Insert: {
          barcode?: string | null
          company_id: string
          created_at?: string
          gold_cost?: number
          id?: string
          is_active?: boolean
          item_type?: string
          karat?: string
          making_cost?: number
          name: string
          name_en?: string | null
          product_id?: string | null
          stone_cost?: number
          updated_at?: string
          weight_grams?: number
        }
        Update: {
          barcode?: string | null
          company_id?: string
          created_at?: string
          gold_cost?: number
          id?: string
          is_active?: boolean
          item_type?: string
          karat?: string
          making_cost?: number
          name?: string
          name_en?: string | null
          product_id?: string | null
          stone_cost?: number
          updated_at?: string
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "gold_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gold_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      gold_price_settings: {
        Row: {
          company_id: string
          created_at: string
          id: string
          karat: string
          price_date: string
          price_per_gram: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          karat: string
          price_date?: string
          price_per_gram?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          karat?: string
          price_date?: string
          price_per_gram?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gold_price_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gold_purchase_invoice_items: {
        Row: {
          gold_item_id: string | null
          id: string
          invoice_id: string
          karat: string
          making_cost: number
          price_per_gram: number
          stone_cost: number
          total: number
          weight_grams: number
        }
        Insert: {
          gold_item_id?: string | null
          id?: string
          invoice_id: string
          karat?: string
          making_cost?: number
          price_per_gram?: number
          stone_cost?: number
          total?: number
          weight_grams?: number
        }
        Update: {
          gold_item_id?: string | null
          id?: string
          invoice_id?: string
          karat?: string
          making_cost?: number
          price_per_gram?: number
          stone_cost?: number
          total?: number
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "gold_purchase_invoice_items_gold_item_id_fkey"
            columns: ["gold_item_id"]
            isOneToOne: false
            referencedRelation: "gold_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gold_purchase_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gold_purchase_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      gold_purchase_invoices: {
        Row: {
          branch_id: string
          company_id: string
          contact_id: string | null
          created_at: string
          created_by: string | null
          id: string
          invoice_date: string
          invoice_number: string
          journal_entry_id: string | null
          notes: string | null
          status: string
          total_amount: number
          total_weight: number
        }
        Insert: {
          branch_id: string
          company_id: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          journal_entry_id?: string | null
          notes?: string | null
          status?: string
          total_amount?: number
          total_weight?: number
        }
        Update: {
          branch_id?: string
          company_id?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          journal_entry_id?: string | null
          notes?: string | null
          status?: string
          total_amount?: number
          total_weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "gold_purchase_invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gold_purchase_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gold_purchase_invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gold_purchase_invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      gold_sales_invoice_items: {
        Row: {
          gold_item_id: string | null
          id: string
          invoice_id: string
          karat: string
          making_cost: number
          price_per_gram: number
          stone_cost: number
          total: number
          weight_grams: number
        }
        Insert: {
          gold_item_id?: string | null
          id?: string
          invoice_id: string
          karat?: string
          making_cost?: number
          price_per_gram?: number
          stone_cost?: number
          total?: number
          weight_grams?: number
        }
        Update: {
          gold_item_id?: string | null
          id?: string
          invoice_id?: string
          karat?: string
          making_cost?: number
          price_per_gram?: number
          stone_cost?: number
          total?: number
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "gold_sales_invoice_items_gold_item_id_fkey"
            columns: ["gold_item_id"]
            isOneToOne: false
            referencedRelation: "gold_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gold_sales_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gold_sales_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      gold_sales_invoices: {
        Row: {
          branch_id: string
          company_id: string
          contact_id: string | null
          created_at: string
          created_by: string | null
          id: string
          invoice_date: string
          invoice_number: string
          journal_entry_id: string | null
          notes: string | null
          status: string
          total_amount: number
          total_weight: number
        }
        Insert: {
          branch_id: string
          company_id: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          journal_entry_id?: string | null
          notes?: string | null
          status?: string
          total_amount?: number
          total_weight?: number
        }
        Update: {
          branch_id?: string
          company_id?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          journal_entry_id?: string | null
          notes?: string | null
          status?: string
          total_amount?: number
          total_weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "gold_sales_invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gold_sales_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gold_sales_invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gold_sales_invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_account_settings: {
        Row: {
          bank_account_id: string | null
          cash_account_id: string | null
          company_id: string
          created_at: string | null
          employee_advances_account_id: string | null
          eos_expense_account_id: string | null
          eos_provision_account_id: string | null
          housing_expense_account_id: string | null
          id: string
          loan_receivable_account_id: string | null
          other_allowance_account_id: string | null
          penalties_revenue_account_id: string | null
          rewards_expense_account_id: string | null
          salary_expense_account_id: string | null
          salary_payable_account_id: string | null
          social_insurance_expense_account_id: string | null
          social_insurance_payable_account_id: string | null
          transport_expense_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          bank_account_id?: string | null
          cash_account_id?: string | null
          company_id: string
          created_at?: string | null
          employee_advances_account_id?: string | null
          eos_expense_account_id?: string | null
          eos_provision_account_id?: string | null
          housing_expense_account_id?: string | null
          id?: string
          loan_receivable_account_id?: string | null
          other_allowance_account_id?: string | null
          penalties_revenue_account_id?: string | null
          rewards_expense_account_id?: string | null
          salary_expense_account_id?: string | null
          salary_payable_account_id?: string | null
          social_insurance_expense_account_id?: string | null
          social_insurance_payable_account_id?: string | null
          transport_expense_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          bank_account_id?: string | null
          cash_account_id?: string | null
          company_id?: string
          created_at?: string | null
          employee_advances_account_id?: string | null
          eos_expense_account_id?: string | null
          eos_provision_account_id?: string | null
          housing_expense_account_id?: string | null
          id?: string
          loan_receivable_account_id?: string | null
          other_allowance_account_id?: string | null
          penalties_revenue_account_id?: string | null
          rewards_expense_account_id?: string | null
          salary_expense_account_id?: string | null
          salary_payable_account_id?: string | null
          social_insurance_expense_account_id?: string | null
          social_insurance_payable_account_id?: string | null
          transport_expense_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_account_settings_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_account_settings_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_account_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_account_settings_employee_advances_account_id_fkey"
            columns: ["employee_advances_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_account_settings_eos_expense_account_id_fkey"
            columns: ["eos_expense_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_account_settings_eos_provision_account_id_fkey"
            columns: ["eos_provision_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_account_settings_housing_expense_account_id_fkey"
            columns: ["housing_expense_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_account_settings_loan_receivable_account_id_fkey"
            columns: ["loan_receivable_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_account_settings_other_allowance_account_id_fkey"
            columns: ["other_allowance_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_account_settings_penalties_revenue_account_id_fkey"
            columns: ["penalties_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_account_settings_rewards_expense_account_id_fkey"
            columns: ["rewards_expense_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_account_settings_salary_expense_account_id_fkey"
            columns: ["salary_expense_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_account_settings_salary_payable_account_id_fkey"
            columns: ["salary_payable_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_account_settings_social_insurance_expense_account_id_fkey"
            columns: ["social_insurance_expense_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_account_settings_social_insurance_payable_account_id_fkey"
            columns: ["social_insurance_payable_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_account_settings_transport_expense_account_id_fkey"
            columns: ["transport_expense_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_attendance: {
        Row: {
          attendance_date: string
          check_in: string | null
          check_out: string | null
          company_id: string
          created_at: string | null
          employee_id: string
          id: string
          notes: string | null
          status: string | null
        }
        Insert: {
          attendance_date?: string
          check_in?: string | null
          check_out?: string | null
          company_id: string
          created_at?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          status?: string | null
        }
        Update: {
          attendance_date?: string
          check_in?: string | null
          check_out?: string | null
          company_id?: string
          created_at?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_deductions: {
        Row: {
          amount: number
          company_id: string
          created_at: string | null
          deduction_date: string
          deduction_type: string
          description: string | null
          description_en: string | null
          employee_id: string
          id: string
          is_applied: boolean | null
          notes: string | null
          occurrence_number: number | null
          payroll_run_id: string | null
          penalty_rule_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string | null
          deduction_date?: string
          deduction_type?: string
          description?: string | null
          description_en?: string | null
          employee_id: string
          id?: string
          is_applied?: boolean | null
          notes?: string | null
          occurrence_number?: number | null
          payroll_run_id?: string | null
          penalty_rule_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string | null
          deduction_date?: string
          deduction_type?: string
          description?: string | null
          description_en?: string | null
          employee_id?: string
          id?: string
          is_applied?: boolean | null
          notes?: string | null
          occurrence_number?: number | null
          payroll_run_id?: string | null
          penalty_rule_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_deductions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_deductions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_deductions_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "hr_payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_deductions_penalty_rule_id_fkey"
            columns: ["penalty_rule_id"]
            isOneToOne: false
            referencedRelation: "hr_penalty_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_departments: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          manager_name: string | null
          name: string
          name_en: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          manager_name?: string | null
          name: string
          name_en?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          manager_name?: string | null
          name?: string
          name_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_employees: {
        Row: {
          account_id: string | null
          bank_iban: string | null
          bank_name: string | null
          basic_salary: number
          border_number: string | null
          company_id: string
          contract_duration_months: number | null
          contract_end_date: string | null
          cost_center_id: string | null
          created_at: string | null
          department_id: string | null
          email: string | null
          employee_number: string
          gender: string | null
          gosi_amount: number | null
          gosi_registration_date: string | null
          has_iqama: boolean | null
          health_card_expiry: string | null
          health_card_number: string | null
          hire_date: string
          housing_allowance: number | null
          id: string
          iqama_expiry: string | null
          iqama_number: string | null
          job_title: string | null
          job_title_en: string | null
          name: string
          name_en: string | null
          national_id: string | null
          nationality: string | null
          other_allowance: number | null
          passport_expiry: string | null
          passport_number: string | null
          phone: string | null
          start_date: string | null
          status: string | null
          termination_date: string | null
          termination_reason: string | null
          transport_allowance: number | null
          updated_at: string | null
          visa_expiry: string | null
          work_shift_id: string | null
        }
        Insert: {
          account_id?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          basic_salary?: number
          border_number?: string | null
          company_id: string
          contract_duration_months?: number | null
          contract_end_date?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          employee_number: string
          gender?: string | null
          gosi_amount?: number | null
          gosi_registration_date?: string | null
          has_iqama?: boolean | null
          health_card_expiry?: string | null
          health_card_number?: string | null
          hire_date?: string
          housing_allowance?: number | null
          id?: string
          iqama_expiry?: string | null
          iqama_number?: string | null
          job_title?: string | null
          job_title_en?: string | null
          name: string
          name_en?: string | null
          national_id?: string | null
          nationality?: string | null
          other_allowance?: number | null
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          start_date?: string | null
          status?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          transport_allowance?: number | null
          updated_at?: string | null
          visa_expiry?: string | null
          work_shift_id?: string | null
        }
        Update: {
          account_id?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          basic_salary?: number
          border_number?: string | null
          company_id?: string
          contract_duration_months?: number | null
          contract_end_date?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          employee_number?: string
          gender?: string | null
          gosi_amount?: number | null
          gosi_registration_date?: string | null
          has_iqama?: boolean | null
          health_card_expiry?: string | null
          health_card_number?: string | null
          hire_date?: string
          housing_allowance?: number | null
          id?: string
          iqama_expiry?: string | null
          iqama_number?: string | null
          job_title?: string | null
          job_title_en?: string | null
          name?: string
          name_en?: string | null
          national_id?: string | null
          nationality?: string | null
          other_allowance?: number | null
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          start_date?: string | null
          status?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          transport_allowance?: number | null
          updated_at?: string | null
          visa_expiry?: string | null
          work_shift_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_employees_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_work_shift_id_fkey"
            columns: ["work_shift_id"]
            isOneToOne: false
            referencedRelation: "hr_work_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_leaves: {
        Row: {
          approved_by: string | null
          company_id: string
          created_at: string | null
          days_count: number
          employee_id: string
          end_date: string
          id: string
          leave_type: string
          notes: string | null
          start_date: string
          status: string | null
        }
        Insert: {
          approved_by?: string | null
          company_id: string
          created_at?: string | null
          days_count?: number
          employee_id: string
          end_date: string
          id?: string
          leave_type?: string
          notes?: string | null
          start_date: string
          status?: string | null
        }
        Update: {
          approved_by?: string | null
          company_id?: string
          created_at?: string | null
          days_count?: number
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: string
          notes?: string | null
          start_date?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_leaves_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_leaves_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_loans: {
        Row: {
          amount: number
          company_id: string
          created_at: string | null
          employee_id: string
          id: string
          journal_entry_id: string | null
          loan_type: string | null
          monthly_deduction: number
          notes: string | null
          remaining: number | null
          start_date: string
          status: string | null
          total_paid: number | null
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string | null
          employee_id: string
          id?: string
          journal_entry_id?: string | null
          loan_type?: string | null
          monthly_deduction?: number
          notes?: string | null
          remaining?: number | null
          start_date?: string
          status?: string | null
          total_paid?: number | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string | null
          employee_id?: string
          id?: string
          journal_entry_id?: string | null
          loan_type?: string | null
          monthly_deduction?: number
          notes?: string | null
          remaining?: number | null
          start_date?: string
          status?: string | null
          total_paid?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_loans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_loans_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_payroll_items: {
        Row: {
          absence_deduction: number | null
          basic_salary: number | null
          employee_id: string
          housing_allowance: number | null
          id: string
          loan_deduction: number | null
          net_salary: number | null
          other_allowance: number | null
          other_deduction: number | null
          payroll_run_id: string
          total_allowances: number | null
          total_deductions: number | null
          transport_allowance: number | null
        }
        Insert: {
          absence_deduction?: number | null
          basic_salary?: number | null
          employee_id: string
          housing_allowance?: number | null
          id?: string
          loan_deduction?: number | null
          net_salary?: number | null
          other_allowance?: number | null
          other_deduction?: number | null
          payroll_run_id: string
          total_allowances?: number | null
          total_deductions?: number | null
          transport_allowance?: number | null
        }
        Update: {
          absence_deduction?: number | null
          basic_salary?: number | null
          employee_id?: string
          housing_allowance?: number | null
          id?: string
          loan_deduction?: number | null
          net_salary?: number | null
          other_allowance?: number | null
          other_deduction?: number | null
          payroll_run_id?: string
          total_allowances?: number | null
          total_deductions?: number | null
          transport_allowance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_payroll_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_payroll_items_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "hr_payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_payroll_runs: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          journal_entry_id: string | null
          period_month: number
          period_year: number
          run_date: string | null
          run_number: string
          status: string | null
          total_allowances: number | null
          total_basic: number | null
          total_deductions: number | null
          total_net: number | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          journal_entry_id?: string | null
          period_month: number
          period_year: number
          run_date?: string | null
          run_number: string
          status?: string | null
          total_allowances?: number | null
          total_basic?: number | null
          total_deductions?: number | null
          total_net?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          journal_entry_id?: string | null
          period_month?: number
          period_year?: number
          run_date?: string | null
          run_number?: string
          status?: string | null
          total_allowances?: number | null
          total_basic?: number | null
          total_deductions?: number | null
          total_net?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_payroll_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_penalty_rules: {
        Row: {
          category: string
          company_id: string
          created_at: string | null
          fifth_offense: string | null
          first_offense: string
          fourth_offense: string | null
          id: string
          is_active: boolean | null
          second_offense: string
          sort_order: number | null
          third_offense: string
          updated_at: string | null
          violation_code: string
          violation_name: string
          violation_name_en: string | null
        }
        Insert: {
          category?: string
          company_id: string
          created_at?: string | null
          fifth_offense?: string | null
          first_offense?: string
          fourth_offense?: string | null
          id?: string
          is_active?: boolean | null
          second_offense?: string
          sort_order?: number | null
          third_offense?: string
          updated_at?: string | null
          violation_code: string
          violation_name: string
          violation_name_en?: string | null
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string | null
          fifth_offense?: string | null
          first_offense?: string
          fourth_offense?: string | null
          id?: string
          is_active?: boolean | null
          second_offense?: string
          sort_order?: number | null
          third_offense?: string
          updated_at?: string | null
          violation_code?: string
          violation_name?: string
          violation_name_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_penalty_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_work_shifts: {
        Row: {
          break_minutes: number | null
          company_id: string
          created_at: string | null
          end_time: string
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          notes: string | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          break_minutes?: number | null
          company_id: string
          created_at?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          notes?: string | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          break_minutes?: number | null
          company_id?: string
          created_at?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          notes?: string | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_work_shifts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_consumption_items: {
        Row: {
          consumption_id: string
          id: string
          notes: string | null
          product_id: string
          quantity: number
          unit_cost: number | null
        }
        Insert: {
          consumption_id: string
          id?: string
          notes?: string | null
          product_id: string
          quantity?: number
          unit_cost?: number | null
        }
        Update: {
          consumption_id?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_consumption_items_consumption_id_fkey"
            columns: ["consumption_id"]
            isOneToOne: false
            referencedRelation: "internal_consumptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_consumption_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_consumptions: {
        Row: {
          branch_id: string
          company_id: string
          consumption_date: string
          consumption_number: string
          created_at: string
          created_by: string | null
          department: string | null
          id: string
          notes: string | null
          reason: string | null
          status: string
        }
        Insert: {
          branch_id: string
          company_id: string
          consumption_date?: string
          consumption_number: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          status?: string
        }
        Update: {
          branch_id?: string
          company_id?: string
          consumption_date?: string
          consumption_number?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_consumptions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_consumptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          allowed_modules: string[] | null
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
          allowed_modules?: string[] | null
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
          allowed_modules?: string[] | null
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
          is_locked: boolean | null
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
          zatca_status: string | null
          zatca_uuid: string | null
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
          is_locked?: boolean | null
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
          zatca_status?: string | null
          zatca_uuid?: string | null
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
          is_locked?: boolean | null
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
          zatca_status?: string | null
          zatca_uuid?: string | null
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
      manufacturing_orders: {
        Row: {
          bom_id: string
          branch_id: string
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          order_number: string
          product_id: string
          production_cost: number | null
          quantity: number
          status: string
        }
        Insert: {
          bom_id: string
          branch_id: string
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_number: string
          product_id: string
          production_cost?: number | null
          quantity?: number
          status?: string
        }
        Update: {
          bom_id?: string
          branch_id?: string
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          product_id?: string
          production_cost?: number | null
          quantity?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "manufacturing_orders_bom_id_fkey"
            columns: ["bom_id"]
            isOneToOne: false
            referencedRelation: "bill_of_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manufacturing_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manufacturing_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manufacturing_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      patients: {
        Row: {
          account_id: string | null
          address: string | null
          allergies: string | null
          blood_type: string | null
          chronic_conditions: string | null
          company_id: string
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          gender: string | null
          id: string
          insurance_number: string | null
          insurance_provider: string | null
          is_active: boolean | null
          mobile: string | null
          name: string
          name_en: string | null
          notes: string | null
          patient_number: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          address?: string | null
          allergies?: string | null
          blood_type?: string | null
          chronic_conditions?: string | null
          company_id: string
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          gender?: string | null
          id?: string
          insurance_number?: string | null
          insurance_provider?: string | null
          is_active?: boolean | null
          mobile?: string | null
          name: string
          name_en?: string | null
          notes?: string | null
          patient_number: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          address?: string | null
          allergies?: string | null
          blood_type?: string | null
          chronic_conditions?: string | null
          company_id?: string
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          gender?: string | null
          id?: string
          insurance_number?: string | null
          insurance_provider?: string | null
          is_active?: boolean | null
          mobile?: string | null
          name?: string
          name_en?: string | null
          notes?: string | null
          patient_number?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      pos_account_settings: {
        Row: {
          bank_transfer_account_id: string | null
          card_account_id: string | null
          cash_account_id: string | null
          cogs_account_id: string | null
          company_id: string
          coupon_expense_account_id: string | null
          created_at: string | null
          discount_account_id: string | null
          id: string
          inventory_account_id: string | null
          refund_account_id: string | null
          sales_revenue_account_id: string | null
          sales_tax_account_id: string | null
          tips_revenue_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          bank_transfer_account_id?: string | null
          card_account_id?: string | null
          cash_account_id?: string | null
          cogs_account_id?: string | null
          company_id: string
          coupon_expense_account_id?: string | null
          created_at?: string | null
          discount_account_id?: string | null
          id?: string
          inventory_account_id?: string | null
          refund_account_id?: string | null
          sales_revenue_account_id?: string | null
          sales_tax_account_id?: string | null
          tips_revenue_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          bank_transfer_account_id?: string | null
          card_account_id?: string | null
          cash_account_id?: string | null
          cogs_account_id?: string | null
          company_id?: string
          coupon_expense_account_id?: string | null
          created_at?: string | null
          discount_account_id?: string | null
          id?: string
          inventory_account_id?: string | null
          refund_account_id?: string | null
          sales_revenue_account_id?: string | null
          sales_tax_account_id?: string | null
          tips_revenue_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_account_settings_bank_transfer_account_id_fkey"
            columns: ["bank_transfer_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_account_settings_card_account_id_fkey"
            columns: ["card_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_account_settings_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_account_settings_cogs_account_id_fkey"
            columns: ["cogs_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_account_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_account_settings_coupon_expense_account_id_fkey"
            columns: ["coupon_expense_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_account_settings_discount_account_id_fkey"
            columns: ["discount_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_account_settings_inventory_account_id_fkey"
            columns: ["inventory_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_account_settings_refund_account_id_fkey"
            columns: ["refund_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_account_settings_sales_revenue_account_id_fkey"
            columns: ["sales_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_account_settings_sales_tax_account_id_fkey"
            columns: ["sales_tax_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_account_settings_tips_revenue_account_id_fkey"
            columns: ["tips_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_activity_log: {
        Row: {
          action: string
          company_id: string
          created_at: string
          details: Json | null
          id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          details?: Json | null
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_activity_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_activity_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pos_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_coupons: {
        Row: {
          code: string
          company_id: string
          created_at: string | null
          discount_type: string
          discount_value: number
          end_date: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_order_amount: number | null
          name: string
          name_en: string | null
          start_date: string | null
          used_count: number | null
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          name: string
          name_en?: string | null
          start_date?: string | null
          used_count?: number | null
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          name?: string
          name_en?: string | null
          start_date?: string | null
          used_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_coupons_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_menu_items: {
        Row: {
          category_group: string | null
          display_name: string | null
          display_name_en: string | null
          id: string
          is_available: boolean
          menu_id: string
          price_override: number | null
          product_id: string | null
          sort_order: number
        }
        Insert: {
          category_group?: string | null
          display_name?: string | null
          display_name_en?: string | null
          id?: string
          is_available?: boolean
          menu_id: string
          price_override?: number | null
          product_id?: string | null
          sort_order?: number
        }
        Update: {
          category_group?: string | null
          display_name?: string | null
          display_name_en?: string | null
          id?: string
          is_available?: boolean
          menu_id?: string
          price_override?: number | null
          product_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_menu_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "pos_menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_menu_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_menu_prices: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          order_type: string
          price: number
          product_id: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          order_type: string
          price?: number
          product_id: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          order_type?: string
          price?: number
          product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_menu_prices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_menu_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_menus: {
        Row: {
          branch_id: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_en: string | null
        }
        Insert: {
          branch_id: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_en?: string | null
        }
        Update: {
          branch_id?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_menus_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_menus_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_promotion_products: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          product_id: string
          promotion_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          product_id: string
          promotion_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          product_id?: string
          promotion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_promotion_products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_promotion_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_promotion_products_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "pos_promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_promotions: {
        Row: {
          applicable_branches: Json | null
          applicable_products: Json | null
          company_id: string
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          min_amount: number | null
          name: string
          name_en: string | null
          start_date: string | null
          type: string
          value: number
        }
        Insert: {
          applicable_branches?: Json | null
          applicable_products?: Json | null
          company_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          min_amount?: number | null
          name: string
          name_en?: string | null
          start_date?: string | null
          type?: string
          value?: number
        }
        Update: {
          applicable_branches?: Json | null
          applicable_products?: Json | null
          company_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          min_amount?: number | null
          name?: string
          name_en?: string | null
          start_date?: string | null
          type?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_promotions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_reservations: {
        Row: {
          branch_id: string
          company_id: string
          customer_name: string
          deposit_amount: number | null
          id: string
          notes: string | null
          party_size: number
          phone: string | null
          reservation_date: string
          reservation_time: string
          status: string
          table_id: string | null
        }
        Insert: {
          branch_id: string
          company_id: string
          customer_name: string
          deposit_amount?: number | null
          id?: string
          notes?: string | null
          party_size?: number
          phone?: string | null
          reservation_date: string
          reservation_time: string
          status?: string
          table_id?: string | null
        }
        Update: {
          branch_id?: string
          company_id?: string
          customer_name?: string
          deposit_amount?: number | null
          id?: string
          notes?: string | null
          party_size?: number
          phone?: string | null
          reservation_date?: string
          reservation_time?: string
          status?: string
          table_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_reservations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_reservations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "pos_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sales_targets: {
        Row: {
          achieved_value: number
          branch_id: string | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          notification_interval: Json | null
          period_end: string
          period_start: string
          product_id: string | null
          target_type: string
          target_value: number
          user_id: string | null
        }
        Insert: {
          achieved_value?: number
          branch_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          notification_interval?: Json | null
          period_end: string
          period_start: string
          product_id?: string | null
          target_type?: string
          target_value?: number
          user_id?: string | null
        }
        Update: {
          achieved_value?: number
          branch_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          notification_interval?: Json | null
          period_end?: string
          period_start?: string
          product_id?: string | null
          target_type?: string
          target_value?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_sales_targets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sales_targets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sales_targets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sessions: {
        Row: {
          branch_id: string
          closed_at: string | null
          closed_by: string | null
          closing_amount: number | null
          closing_report_printed: boolean | null
          company_id: string
          expected_amount: number | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string | null
          opening_amount: number
          payment_summary: Json | null
          status: string
          terminal_id: string
          total_discounts: number | null
          total_promotions: number | null
          total_returns: number | null
          total_sales: number | null
        }
        Insert: {
          branch_id: string
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          closing_report_printed?: boolean | null
          company_id: string
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_amount?: number
          payment_summary?: Json | null
          status?: string
          terminal_id: string
          total_discounts?: number | null
          total_promotions?: number | null
          total_returns?: number | null
          total_sales?: number | null
        }
        Update: {
          branch_id?: string
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          closing_report_printed?: boolean | null
          company_id?: string
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_amount?: number
          payment_summary?: Json | null
          status?: string
          terminal_id?: string
          total_discounts?: number | null
          total_promotions?: number | null
          total_returns?: number | null
          total_sales?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sessions_terminal_id_fkey"
            columns: ["terminal_id"]
            isOneToOne: false
            referencedRelation: "pos_terminals"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_tables: {
        Row: {
          branch_id: string
          capacity: number
          company_id: string
          current_transaction_id: string | null
          floor_level: number
          id: string
          position_x: number | null
          position_y: number | null
          shape: string
          status: string
          table_number: string
        }
        Insert: {
          branch_id: string
          capacity?: number
          company_id: string
          current_transaction_id?: string | null
          floor_level?: number
          id?: string
          position_x?: number | null
          position_y?: number | null
          shape?: string
          status?: string
          table_number: string
        }
        Update: {
          branch_id?: string
          capacity?: number
          company_id?: string
          current_transaction_id?: string | null
          floor_level?: number
          id?: string
          position_x?: number | null
          position_y?: number | null
          shape?: string
          status?: string
          table_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_tables_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_tables_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_terminals: {
        Row: {
          branch_id: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_en: string | null
          operating_hours: Json | null
          printer_config: Json | null
          terminal_type: string
        }
        Insert: {
          branch_id: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_en?: string | null
          operating_hours?: Json | null
          printer_config?: Json | null
          terminal_type?: string
        }
        Update: {
          branch_id?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_en?: string | null
          operating_hours?: Json | null
          printer_config?: Json | null
          terminal_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_terminals_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_terminals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_transaction_items: {
        Row: {
          discount: number
          id: string
          notes: string | null
          product_id: string | null
          quantity: number
          tax_amount: number
          total: number
          transaction_id: string
          unit_price: number
        }
        Insert: {
          discount?: number
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          tax_amount?: number
          total?: number
          transaction_id: string
          unit_price?: number
        }
        Update: {
          discount?: number
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          tax_amount?: number
          total?: number
          transaction_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_transaction_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "pos_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_transactions: {
        Row: {
          branch_id: string
          change_amount: number
          company_id: string
          contact_id: string | null
          created_at: string
          created_by: string | null
          delivery_app: string | null
          delivery_fee: number
          discount_amount: number
          extra_charges: number
          id: string
          invoice_id: string | null
          order_type: string
          paid_amount: number
          payment_method: string
          session_id: string | null
          status: string
          subtotal: number
          table_id: string | null
          tax_amount: number
          terminal_id: string | null
          total: number
          transaction_number: string
        }
        Insert: {
          branch_id: string
          change_amount?: number
          company_id: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          delivery_app?: string | null
          delivery_fee?: number
          discount_amount?: number
          extra_charges?: number
          id?: string
          invoice_id?: string | null
          order_type?: string
          paid_amount?: number
          payment_method?: string
          session_id?: string | null
          status?: string
          subtotal?: number
          table_id?: string | null
          tax_amount?: number
          terminal_id?: string | null
          total?: number
          transaction_number: string
        }
        Update: {
          branch_id?: string
          change_amount?: number
          company_id?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          delivery_app?: string | null
          delivery_fee?: number
          discount_amount?: number
          extra_charges?: number
          id?: string
          invoice_id?: string | null
          order_type?: string
          paid_amount?: number
          payment_method?: string
          session_id?: string | null
          status?: string
          subtotal?: number
          table_id?: string | null
          tax_amount?: number
          terminal_id?: string | null
          total?: number
          transaction_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pos_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "pos_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_terminal_id_fkey"
            columns: ["terminal_id"]
            isOneToOne: false
            referencedRelation: "pos_terminals"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_users: {
        Row: {
          branch_id: string
          company_id: string
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          role: string
          user_id: string
        }
        Insert: {
          branch_id: string
          company_id: string
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          role?: string
          user_id: string
        }
        Update: {
          branch_id?: string
          company_id?: string
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_users_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          dosage: string | null
          duration: string | null
          frequency: string | null
          id: string
          instructions: string | null
          medicine_name: string
          prescription_id: string
          quantity: number | null
        }
        Insert: {
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          medicine_name: string
          prescription_id: string
          quantity?: number | null
        }
        Update: {
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          medicine_name?: string
          prescription_id?: string
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          appointment_id: string | null
          company_id: string
          created_at: string | null
          doctor_id: string
          id: string
          is_active: boolean | null
          notes: string | null
          patient_id: string
          prescription_date: string
        }
        Insert: {
          appointment_id?: string | null
          company_id: string
          created_at?: string | null
          doctor_id: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          patient_id: string
          prescription_date?: string
        }
        Update: {
          appointment_id?: string | null
          company_id?: string
          created_at?: string | null
          doctor_id?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          patient_id?: string
          prescription_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
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
          image_url: string | null
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
          image_url?: string | null
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
          image_url?: string | null
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
          avg_cost: number | null
          id: string
          product_id: string
          quantity: number | null
          reserved_quantity: number | null
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          avg_cost?: number | null
          id?: string
          product_id: string
          quantity?: number | null
          reserved_quantity?: number | null
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          avg_cost?: number | null
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
          is_taxable: boolean | null
          max_stock: number | null
          min_stock: number | null
          name: string
          name_en: string | null
          oem_number: string | null
          part_condition: string | null
          product_type: string | null
          purchase_price: number | null
          reorder_level: number | null
          sale_price: number | null
          shelf_location: string | null
          show_in_pos: boolean | null
          sku: string | null
          tax_rate: number | null
          tracking_method: string | null
          unit: string | null
          unit_id: string | null
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
          is_taxable?: boolean | null
          max_stock?: number | null
          min_stock?: number | null
          name: string
          name_en?: string | null
          oem_number?: string | null
          part_condition?: string | null
          product_type?: string | null
          purchase_price?: number | null
          reorder_level?: number | null
          sale_price?: number | null
          shelf_location?: string | null
          show_in_pos?: boolean | null
          sku?: string | null
          tax_rate?: number | null
          tracking_method?: string | null
          unit?: string | null
          unit_id?: string | null
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
          is_taxable?: boolean | null
          max_stock?: number | null
          min_stock?: number | null
          name?: string
          name_en?: string | null
          oem_number?: string | null
          part_condition?: string | null
          product_type?: string | null
          purchase_price?: number | null
          reorder_level?: number | null
          sale_price?: number | null
          shelf_location?: string | null
          show_in_pos?: boolean | null
          sku?: string | null
          tax_rate?: number | null
          tracking_method?: string | null
          unit?: string | null
          unit_id?: string | null
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
          {
            foreignKeyName: "products_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
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
      re_account_settings: {
        Row: {
          bank_account_id: string | null
          cash_account_id: string | null
          company_id: string
          created_at: string | null
          id: string
          maintenance_expense_account_id: string | null
          rental_revenue_account_id: string | null
          security_deposit_liability_account_id: string | null
          tenant_receivable_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          bank_account_id?: string | null
          cash_account_id?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          maintenance_expense_account_id?: string | null
          rental_revenue_account_id?: string | null
          security_deposit_liability_account_id?: string | null
          tenant_receivable_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          bank_account_id?: string | null
          cash_account_id?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          maintenance_expense_account_id?: string | null
          rental_revenue_account_id?: string | null
          security_deposit_liability_account_id?: string | null
          tenant_receivable_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "re_account_settings_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "re_account_settings_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "re_account_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "re_account_settings_maintenance_expense_account_id_fkey"
            columns: ["maintenance_expense_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "re_account_settings_rental_revenue_account_id_fkey"
            columns: ["rental_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "re_account_settings_security_deposit_liability_account_id_fkey"
            columns: ["security_deposit_liability_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "re_account_settings_tenant_receivable_account_id_fkey"
            columns: ["tenant_receivable_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      re_leases: {
        Row: {
          company_id: string
          created_at: string | null
          end_date: string
          id: string
          lease_number: string
          monthly_rent: number | null
          notes: string | null
          payment_frequency: string | null
          security_deposit: number | null
          start_date: string
          status: string | null
          tenant_id: string
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          end_date: string
          id?: string
          lease_number: string
          monthly_rent?: number | null
          notes?: string | null
          payment_frequency?: string | null
          security_deposit?: number | null
          start_date: string
          status?: string | null
          tenant_id: string
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          end_date?: string
          id?: string
          lease_number?: string
          monthly_rent?: number | null
          notes?: string | null
          payment_frequency?: string | null
          security_deposit?: number | null
          start_date?: string
          status?: string | null
          tenant_id?: string
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "re_leases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "re_leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "re_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "re_leases_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "re_units"
            referencedColumns: ["id"]
          },
        ]
      }
      re_maintenance_requests: {
        Row: {
          actual_cost: number | null
          assigned_to: string | null
          company_id: string
          completion_date: string | null
          created_at: string | null
          description: string
          estimated_cost: number | null
          id: string
          notes: string | null
          priority: string | null
          request_date: string
          status: string | null
          tenant_id: string | null
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          actual_cost?: number | null
          assigned_to?: string | null
          company_id: string
          completion_date?: string | null
          created_at?: string | null
          description: string
          estimated_cost?: number | null
          id?: string
          notes?: string | null
          priority?: string | null
          request_date?: string
          status?: string | null
          tenant_id?: string | null
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          actual_cost?: number | null
          assigned_to?: string | null
          company_id?: string
          completion_date?: string | null
          created_at?: string | null
          description?: string
          estimated_cost?: number | null
          id?: string
          notes?: string | null
          priority?: string | null
          request_date?: string
          status?: string | null
          tenant_id?: string | null
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "re_maintenance_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "re_maintenance_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "re_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "re_maintenance_requests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "re_units"
            referencedColumns: ["id"]
          },
        ]
      }
      re_properties: {
        Row: {
          address: string | null
          city: string | null
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          notes: string | null
          property_type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          notes?: string | null
          property_type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          notes?: string | null
          property_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "re_properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      re_rent_invoices: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          invoice_date: string
          invoice_number: string
          journal_entry_id: string | null
          late_fee: number | null
          lease_id: string | null
          notes: string | null
          paid_amount: number | null
          payment_status: string | null
          period_from: string | null
          period_to: string | null
          tenant_id: string
          total_amount: number | null
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          journal_entry_id?: string | null
          late_fee?: number | null
          lease_id?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_status?: string | null
          period_from?: string | null
          period_to?: string | null
          tenant_id: string
          total_amount?: number | null
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          journal_entry_id?: string | null
          late_fee?: number | null
          lease_id?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_status?: string | null
          period_from?: string | null
          period_to?: string | null
          tenant_id?: string
          total_amount?: number | null
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "re_rent_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "re_rent_invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "re_rent_invoices_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "re_leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "re_rent_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "re_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "re_rent_invoices_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "re_units"
            referencedColumns: ["id"]
          },
        ]
      }
      re_rent_payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string | null
          id: string
          invoice_id: string
          journal_entry_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string | null
          reference: string | null
          tenant_id: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string | null
          id?: string
          invoice_id: string
          journal_entry_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          reference?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string | null
          id?: string
          invoice_id?: string
          journal_entry_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          reference?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "re_rent_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "re_rent_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "re_rent_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "re_rent_payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "re_rent_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "re_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      re_tenants: {
        Row: {
          address: string | null
          company_id: string
          created_at: string | null
          email: string | null
          id: string
          id_number: string | null
          name: string
          name_en: string | null
          notes: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          id_number?: string | null
          name: string
          name_en?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          id_number?: string | null
          name?: string
          name_en?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "re_tenants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      re_units: {
        Row: {
          area_sqm: number | null
          company_id: string
          created_at: string | null
          floor_number: number | null
          id: string
          monthly_rent: number | null
          notes: string | null
          property_id: string
          status: string | null
          unit_number: string
          unit_type: string | null
          updated_at: string | null
        }
        Insert: {
          area_sqm?: number | null
          company_id: string
          created_at?: string | null
          floor_number?: number | null
          id?: string
          monthly_rent?: number | null
          notes?: string | null
          property_id: string
          status?: string | null
          unit_number: string
          unit_type?: string | null
          updated_at?: string | null
        }
        Update: {
          area_sqm?: number | null
          company_id?: string
          created_at?: string | null
          floor_number?: number | null
          id?: string
          monthly_rent?: number | null
          notes?: string | null
          property_id?: string
          status?: string | null
          unit_number?: string
          unit_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "re_units_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "re_units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "re_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustment_items: {
        Row: {
          adjustment_id: string
          id: string
          notes: string | null
          product_id: string
          quantity: number
          unit_cost: number | null
        }
        Insert: {
          adjustment_id: string
          id?: string
          notes?: string | null
          product_id: string
          quantity?: number
          unit_cost?: number | null
        }
        Update: {
          adjustment_id?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustment_items_adjustment_id_fkey"
            columns: ["adjustment_id"]
            isOneToOne: false
            referencedRelation: "stock_adjustments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustment_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          adjustment_date: string
          adjustment_number: string
          adjustment_type: string
          approved_by: string | null
          branch_id: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          reason: string | null
          status: string
        }
        Insert: {
          adjustment_date?: string
          adjustment_number: string
          adjustment_type?: string
          approved_by?: string | null
          branch_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          status?: string
        }
        Update: {
          adjustment_date?: string
          adjustment_number?: string
          adjustment_type?: string
          approved_by?: string | null
          branch_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      stock_transfer_items: {
        Row: {
          id: string
          notes: string | null
          product_id: string
          quantity_received: number | null
          quantity_sent: number
          transfer_id: string
        }
        Insert: {
          id?: string
          notes?: string | null
          product_id: string
          quantity_received?: number | null
          quantity_sent?: number
          transfer_id: string
        }
        Update: {
          id?: string
          notes?: string | null
          product_id?: string
          quantity_received?: number | null
          quantity_sent?: number
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfer_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          from_branch_id: string
          id: string
          notes: string | null
          received_by: string | null
          status: string
          to_branch_id: string
          transfer_date: string
          transfer_number: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          from_branch_id: string
          id?: string
          notes?: string | null
          received_by?: string | null
          status?: string
          to_branch_id: string
          transfer_date?: string
          transfer_number: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          from_branch_id?: string
          id?: string
          notes?: string | null
          received_by?: string | null
          status?: string
          to_branch_id?: string
          transfer_date?: string
          transfer_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_from_branch_id_fkey"
            columns: ["from_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_branch_id_fkey"
            columns: ["to_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
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
          allows_fractions: boolean | null
          base_unit_id: string | null
          company_id: string
          conversion_rate: number | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          symbol: string | null
        }
        Insert: {
          allows_fractions?: boolean | null
          base_unit_id?: string | null
          company_id: string
          conversion_rate?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          symbol?: string | null
        }
        Update: {
          allows_fractions?: boolean | null
          base_unit_id?: string | null
          company_id?: string
          conversion_rate?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          symbol?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_base_unit_id_fkey"
            columns: ["base_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
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
      zatca_invoice_logs: {
        Row: {
          company_id: string
          created_at: string
          icv: number
          id: string
          invoice_hash: string | null
          invoice_id: string
          invoice_type: string
          pih: string | null
          qr_code: string | null
          submission_status: string
          submitted_at: string | null
          uuid: string
          xml_content: string | null
          zatca_response: Json | null
        }
        Insert: {
          company_id: string
          created_at?: string
          icv: number
          id?: string
          invoice_hash?: string | null
          invoice_id: string
          invoice_type?: string
          pih?: string | null
          qr_code?: string | null
          submission_status?: string
          submitted_at?: string | null
          uuid: string
          xml_content?: string | null
          zatca_response?: Json | null
        }
        Update: {
          company_id?: string
          created_at?: string
          icv?: number
          id?: string
          invoice_hash?: string | null
          invoice_id?: string
          invoice_type?: string
          pih?: string | null
          qr_code?: string | null
          submission_status?: string
          submitted_at?: string | null
          uuid?: string
          xml_content?: string | null
          zatca_response?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "zatca_invoice_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zatca_invoice_logs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      zatca_retry_queue: {
        Row: {
          company_id: string
          created_at: string
          id: string
          invoice_id: string
          last_error: string | null
          max_retries: number
          next_retry_at: string
          retry_count: number
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          invoice_id: string
          last_error?: string | null
          max_retries?: number
          next_retry_at?: string
          retry_count?: number
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          invoice_id?: string
          last_error?: string | null
          max_retries?: number
          next_retry_at?: string
          retry_count?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "zatca_retry_queue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zatca_retry_queue_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      zatca_settings: {
        Row: {
          building_number: string | null
          city: string | null
          company_id: string
          compliance_csid: string | null
          country_code: string | null
          created_at: string
          district: string | null
          environment: string
          icv_counter: number
          id: string
          is_enabled: boolean
          last_invoice_hash: string | null
          otp: string | null
          postal_code: string | null
          private_key: string | null
          production_csid: string | null
          seller_name: string | null
          street: string | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          building_number?: string | null
          city?: string | null
          company_id: string
          compliance_csid?: string | null
          country_code?: string | null
          created_at?: string
          district?: string | null
          environment?: string
          icv_counter?: number
          id?: string
          is_enabled?: boolean
          last_invoice_hash?: string | null
          otp?: string | null
          postal_code?: string | null
          private_key?: string | null
          production_csid?: string | null
          seller_name?: string | null
          street?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          building_number?: string | null
          city?: string | null
          company_id?: string
          compliance_csid?: string | null
          country_code?: string | null
          created_at?: string
          district?: string | null
          environment?: string
          icv_counter?: number
          id?: string
          is_enabled?: boolean
          last_invoice_hash?: string | null
          otp?: string | null
          postal_code?: string | null
          private_key?: string | null
          production_csid?: string | null
          seller_name?: string | null
          street?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zatca_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
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
      confirm_gold_purchase: { Args: { p_invoice_id: string }; Returns: Json }
      confirm_gold_sale: { Args: { p_invoice_id: string }; Returns: Json }
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
      get_cash_flow_report: {
        Args: {
          p_company_id: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_company_features: { Args: { p_company_id: string }; Returns: Json }
      get_company_permissions: { Args: { p_company_id: string }; Returns: Json }
      get_company_usage: { Args: { p_company_id: string }; Returns: Json }
      get_enriched_audit_logs: {
        Args: {
          p_limit?: number
          p_operation_filter?: string
          p_severity_filter?: string
          p_table_filter?: string
        }
        Returns: {
          company_id: string
          company_name: string
          company_name_en: string
          created_at: string
          details: string
          id: string
          new_data: Json
          old_data: Json
          operation_type: string
          record_id: string
          severity: string
          table_name: string
          user_email: string
          user_full_name: string
          user_id: string
        }[]
      }
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
      reverse_and_delete_invoice: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      reverse_treasury_transaction: {
        Args: { p_company_id: string; p_transaction_id: string }
        Returns: Json
      }
      rpc_inventory_adjustment:
        | {
            Args: {
              p_adjustment_date: string
              p_adjustment_type: string
              p_branch_id: string
              p_company_id: string
              p_created_by?: string
              p_items?: Json
              p_notes?: string
              p_reason?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_adjustment_date: string
              p_adjustment_type: string
              p_branch_id: string
              p_company_id: string
              p_created_by?: string
              p_items?: Json
              p_notes?: string
              p_reason?: string
            }
            Returns: Json
          }
      rpc_inventory_consumption:
        | {
            Args: {
              p_branch_id: string
              p_company_id: string
              p_consumption_date: string
              p_created_by?: string
              p_department?: string
              p_items?: Json
              p_notes?: string
              p_reason?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_branch_id: string
              p_company_id: string
              p_consumption_date: string
              p_created_by?: string
              p_department?: string
              p_items?: Json
              p_notes?: string
              p_reason?: string
            }
            Returns: Json
          }
      rpc_inventory_manufacturing: {
        Args: {
          p_company_id: string
          p_completed_by?: string
          p_order_id: string
        }
        Returns: Json
      }
      rpc_inventory_transfer: {
        Args: {
          p_company_id: string
          p_received_by?: string
          p_transfer_id: string
        }
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
