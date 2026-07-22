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
      agent_activity_log: {
        Row: {
          action: string
          agent_id: string
          atm_id: string
          created_at: string
          id: string
        }
        Insert: {
          action?: string
          agent_id: string
          atm_id: string
          created_at?: string
          id?: string
        }
        Update: {
          action?: string
          agent_id?: string
          atm_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action_type: string
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_earnings: {
        Row: {
          agent_id: string
          amount_kz: number
          atm_id: string
          created_at: string
          id: string
          view_id: string
        }
        Insert: {
          agent_id: string
          amount_kz?: number
          atm_id: string
          created_at?: string
          id?: string
          view_id: string
        }
        Update: {
          agent_id?: string
          amount_kz?: number
          atm_id?: string
          created_at?: string
          id?: string
          view_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_earnings_view_id_fkey"
            columns: ["view_id"]
            isOneToOne: false
            referencedRelation: "atm_views"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_onboarding_progress: {
        Row: {
          agent_id: string
          created_at: string
          first_atm_approved: boolean
          first_atm_submitted: boolean
          id: string
          onboarding_seen: boolean
          pending_atm_id: string | null
          profile_completed: boolean
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          first_atm_approved?: boolean
          first_atm_submitted?: boolean
          id?: string
          onboarding_seen?: boolean
          pending_atm_id?: string | null
          profile_completed?: boolean
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          first_atm_approved?: boolean
          first_atm_submitted?: boolean
          id?: string
          onboarding_seen?: boolean
          pending_atm_id?: string | null
          profile_completed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      agent_ratings: {
        Row: {
          agent_id: string
          atm_id: string
          comment: string | null
          created_at: string
          id: string
          user_id: string
          vote: boolean
        }
        Insert: {
          agent_id: string
          atm_id: string
          comment?: string | null
          created_at?: string
          id?: string
          user_id: string
          vote: boolean
        }
        Update: {
          agent_id?: string
          atm_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          user_id?: string
          vote?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "agent_ratings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agent_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agent_ratings_atm_id_fkey"
            columns: ["atm_id"]
            isOneToOne: false
            referencedRelation: "atms"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_earnings: {
        Row: {
          agent_id: string
          amount_kz: number
          created_at: string
          id: string
          purchase_id: string
          referred_user_id: string
        }
        Insert: {
          agent_id: string
          amount_kz: number
          created_at?: string
          id?: string
          purchase_id: string
          referred_user_id: string
        }
        Update: {
          agent_id?: string
          amount_kz?: number
          created_at?: string
          id?: string
          purchase_id?: string
          referred_user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          id: string
          agent_id: string
          quote: string
          visible: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          quote: string
          visible?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          quote?: string
          visible?: boolean
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      atm_views: {
        Row: {
          agent_id: string | null
          atm_id: string
          expires_at: string
          granted_at: string
          id: string
          is_active: boolean
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          atm_id: string
          expires_at?: string
          granted_at?: string
          id?: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          agent_id?: string | null
          atm_id?: string
          expires_at?: string
          granted_at?: string
          id?: string
          is_active?: boolean
          user_id?: string
        }
        Relationships: []
      }
      atms: {
        Row: {
          address: string
          agent_id: string | null
          bank_name: string
          cidade: string | null
          created_at: string
          deleted_at: string | null
          fila: string | null
          has_cash: boolean
          has_paper: boolean | null
          id: string
          is_demo: boolean
          last_updated: string
          latitude: number
          longitude: number
          obs: string | null
          photo_url: string | null
          provincia: string | null
          rejection_reason: string | null
          status: string | null
          status_approval: string
          submitted_by: string | null
        }
        Insert: {
          address: string
          agent_id?: string | null
          bank_name: string
          cidade?: string | null
          created_at?: string
          deleted_at?: string | null
          fila?: string | null
          has_cash?: boolean
          has_paper?: boolean | null
          id?: string
          is_demo?: boolean
          last_updated?: string
          latitude: number
          longitude: number
          obs?: string | null
          photo_url?: string | null
          provincia?: string | null
          rejection_reason?: string | null
          status?: string | null
          status_approval?: string
          submitted_by?: string | null
        }
        Update: {
          address?: string
          agent_id?: string | null
          bank_name?: string
          cidade?: string | null
          created_at?: string
          deleted_at?: string | null
          fila?: string | null
          has_cash?: boolean
          has_paper?: boolean | null
          id?: string
          is_demo?: boolean
          last_updated?: string
          latitude?: number
          longitude?: number
          obs?: string | null
          photo_url?: string | null
          provincia?: string | null
          rejection_reason?: string | null
          status?: string | null
          status_approval?: string
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atms_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      balance_transactions: {
        Row: {
          agent_id: string
          amount_kz: number
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          type: string
        }
        Insert: {
          agent_id: string
          amount_kz: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          type: string
        }
        Update: {
          agent_id?: string
          amount_kz?: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_transactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      forum_posts: {
        Row: {
          id: string
          provincia: string
          title: string
          message: string
          type: string
          reference_type: string | null
          reference_id: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          provincia: string
          title: string
          message: string
          type?: string
          reference_type?: string | null
          reference_id?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          provincia?: string
          title?: string
          message?: string
          type?: string
          reference_type?: string | null
          reference_id?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      forum_comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          message?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_settings: {
        Row: {
          user_id: string
          provincia: string
          hidden: boolean
          updated_at: string
        }
        Insert: {
          user_id: string
          provincia?: string
          hidden?: boolean
          updated_at?: string
        }
        Update: {
          user_id?: string
          provincia?: string
          hidden?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          created_at: string | null
          expires_at: string
          used: boolean | null
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          created_at?: string | null
          expires_at: string
          used?: boolean | null
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          created_at?: string | null
          expires_at?: string
          used?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_active: boolean
          agent_balance_kz: number
          banned: boolean
          cidade: string | null
          created_at: string
          deleted_at: string | null
          iban: string | null
          iban_titular: string | null
          id: string
          invited_by: string | null
          is_demo: boolean
          nome: string | null
          provincia: string | null
          referral_code: string | null
          role: string
          support_disabled: boolean
          telefone: string
          updated_at: string
          user_id: string
          views_balance: number
        }
        Insert: {
          account_active?: boolean
          agent_balance_kz?: number
          banned?: boolean
          cidade?: string | null
          created_at?: string
          deleted_at?: string | null
          iban?: string | null
          iban_titular?: string | null
          id?: string
          invited_by?: string | null
          is_demo?: boolean
          nome?: string | null
          provincia?: string | null
          referral_code?: string | null
          role?: string
          support_disabled?: boolean
          telefone: string
          updated_at?: string
          user_id: string
          views_balance?: number
        }
        Update: {
          account_active?: boolean
          agent_balance_kz?: number
          banned?: boolean
          cidade?: string | null
          created_at?: string
          deleted_at?: string | null
          iban?: string | null
          iban_titular?: string | null
          id?: string
          invited_by?: string | null
          is_demo?: boolean
          nome?: string | null
          provincia?: string | null
          referral_code?: string | null
          role?: string
          support_disabled?: boolean
          telefone?: string
          updated_at?: string
          user_id?: string
          views_balance?: number
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
      wa_contacts: {
        Row: {
          atm_id: string
          contacted_at: string
          contacted_by: string | null
          id: string
        }
        Insert: {
          atm_id: string
          contacted_at?: string
          contacted_by?: string | null
          id?: string
        }
        Update: {
          atm_id?: string
          contacted_at?: string
          contacted_by?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_contacts_atm_id_fkey"
            columns: ["atm_id"]
            isOneToOne: true
            referencedRelation: "atms"
            referencedColumns: ["id"]
          },
        ]
      }

      withdrawals: {
        Row: {
          agent_id: string
          amount_kz: number
          bank_details: Json
          created_at: string
          id: string
          method: string
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          amount_kz: number
          bank_details?: Json
          created_at?: string
          id?: string
          method?: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          amount_kz?: number
          bank_details?: Json
          created_at?: string
          id?: string
          method?: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ad_projects: {
        Row: {
          id: string
          company_name: string
          status: string
          contact_name: string | null
          contact_phone: string | null
          contact_email: string | null
          notes: string | null
          logo_url: string | null
          banner_url: string | null
          promo_message: string | null
          website_url: string | null
          company_description: string | null
          latitude: number | null
          longitude: number | null
          show_in_atm_list: boolean
          show_in_forum: boolean
          show_as_marker: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_name: string
          status?: string
          contact_name?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          notes?: string | null
          logo_url?: string | null
          banner_url?: string | null
          promo_message?: string | null
          website_url?: string | null
          company_description?: string | null
          latitude?: number | null
          longitude?: number | null
          show_in_atm_list?: boolean
          show_in_forum?: boolean
          show_as_marker?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          status?: string
          contact_name?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          notes?: string | null
          logo_url?: string | null
          banner_url?: string | null
          promo_message?: string | null
          website_url?: string | null
          company_description?: string | null
          latitude?: number | null
          longitude?: number | null
          show_in_atm_list?: boolean
          show_in_forum?: boolean
          show_as_marker?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          approved_by: string | null
          created_at: string
          expires_at: string
          id: string
          payment_ref: string | null
          plan_type: string
          price_kz: number
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          expires_at: string
          id?: string
          payment_ref?: string | null
          plan_type: string
          price_kz: number
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          payment_ref?: string | null
          plan_type?: string
          price_kz?: number
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "subscriptions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      daily_view_usage: {
        Row: {
          user_id: string
          view_count: number
          view_date: string
        }
        Insert: {
          user_id: string
          view_count?: number
          view_date?: string
        }
        Update: {
          user_id?: string
          view_count?: number
          view_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_view_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_role: {
        Args: { _user_id: string; _role: Database["public"]["Enums"]["app_role"] }
        Returns: Json
      }
      approve_pending_atm: { Args: { _atm_id: string }; Returns: string }
      ban_user: { Args: { _user_id: string }; Returns: undefined }
      unban_user: { Args: { _user_id: string }; Returns: undefined }
      is_user_banned: { Args: Record<string, never>; Returns: boolean }
      complete_withdrawal: { Args: { _withdrawal_id: string }; Returns: Json }
      consume_atm_view: { Args: { _atm_id: string }; Returns: Json }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      insert_audit_log: {
        Args: {
          p_action_type: string
          p_target_type: string
          p_target_id?: string
          p_metadata?: Json
        }
        Returns: string
      }
      notify_user: {
        Args: {
          _message: string
          _title: string
          _type?: string
          _user_id: string
        }
        Returns: undefined
      }
      notify_users_by_role: {
        Args: {
          _message: string
          _role: Database["public"]["Enums"]["app_role"]
          _title: string
          _type?: string
        }
        Returns: undefined
      }
      reject_pending_atm: {
        Args: { _atm_id: string; _reason: string }
        Returns: undefined
      }
      reject_withdrawal: {
        Args: { _reason: string; _withdrawal_id: string }
        Returns: Json
      }
      request_withdrawal: {
        Args: {
          _agent_id: string
          _amount_kz: number
          _bank_details: Json
          _method: string
        }
        Returns: Json
      }
      soft_delete_atm: { Args: { _atm_id: string }; Returns: undefined }
      restore_atm: { Args: { _atm_id: string }; Returns: undefined }
      soft_delete_user: { Args: { _user_id: string }; Returns: undefined }
      restore_user: { Args: { _user_id: string }; Returns: undefined }
      hard_delete_user: { Args: { _user_id: string }; Returns: undefined }
      get_agent_count: { Args: Record<string, never>; Returns: number }
      get_agent_rating_stats: { Args: { _agent_id: string; _user_id?: string }; Returns: Json }
      vote_agent: { Args: { _user_id: string; _atm_id: string; _vote: boolean }; Returns: undefined }
      get_agent_ranking: { Args: { _limit?: number }; Returns: Record<string, unknown>[] }
      get_agent_referral_stats: { Args: { _agent_id: string }; Returns: Json }
      get_batch_agent_rating_stats: { Args: { _agent_ids: string[] }; Returns: Json }
      get_batch_agent_referral_stats: { Args: { _agent_ids: string[] }; Returns: Json }
      get_batch_referral_earnings: {
        Args: { _user_ids: string[] }
        Returns: Json
      }
      get_user_detail_data: { Args: { _user_id: string }; Returns: Json }
      validate_referral_code: { Args: { codigo: string }; Returns: Json }
      create_forum_post: {
        Args: {
          p_provincia: string
          p_title: string
          p_message: string
          p_type?: string
          p_reference_type?: string
          p_reference_id?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "supervisor" | "agent" | "user" | "financeiro"
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
      app_role: ["admin", "supervisor", "agent", "user", "financeiro"],
    },
  },
} as const
