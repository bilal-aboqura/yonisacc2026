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
          created_at: string
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
          created_at?: string
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
          created_at?: string
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
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
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
      contacts: {
        Row: {
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
            foreignKeyName: "contacts_company_id_fkey"
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
          credit: number | null
          debit: number | null
          description: string | null
          entry_id: string
          id: string
          sort_order: number | null
        }
        Insert: {
          account_id: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          entry_id: string
          id?: string
          sort_order?: number | null
        }
        Update: {
          account_id?: string
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
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
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
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_service: boolean | null
          max_stock: number | null
          min_stock: number | null
          name: string
          name_en: string | null
          purchase_price: number | null
          sale_price: number | null
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
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_service?: boolean | null
          max_stock?: number | null
          min_stock?: number | null
          name: string
          name_en?: string | null
          purchase_price?: number | null
          sale_price?: number | null
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
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_service?: boolean | null
          max_stock?: number | null
          min_stock?: number | null
          name?: string
          name_en?: string | null
          purchase_price?: number | null
          sale_price?: number | null
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
          payment_method: string | null
          reference_number: string | null
          status: string | null
          transaction_date: string
          transaction_number: string
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
          payment_method?: string | null
          reference_number?: string | null
          status?: string | null
          transaction_date?: string
          transaction_number: string
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
          payment_method?: string | null
          reference_number?: string | null
          status?: string | null
          transaction_date?: string
          transaction_number?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_owner: { Args: { _company_id: string }; Returns: boolean }
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
