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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      cash_contributions: {
        Row: {
          amount: number
          contributor_email: string | null
          contributor_name: string
          created_at: string
          fund_id: string
          id: string
          is_anonymous: boolean | null
          message: string | null
          payment_reference: string | null
          payment_status: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          contributor_email?: string | null
          contributor_name: string
          created_at?: string
          fund_id: string
          id?: string
          is_anonymous?: boolean | null
          message?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          contributor_email?: string | null
          contributor_name?: string
          created_at?: string
          fund_id?: string
          id?: string
          is_anonymous?: boolean | null
          message?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_contributions_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "cash_funds"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_funds: {
        Row: {
          created_at: string
          current_amount: number | null
          display_order: number | null
          fund_description: string | null
          fund_name: string
          id: string
          is_active: boolean | null
          target_amount: number | null
          updated_at: string
          wishlist_id: string
        }
        Insert: {
          created_at?: string
          current_amount?: number | null
          display_order?: number | null
          fund_description?: string | null
          fund_name: string
          id?: string
          is_active?: boolean | null
          target_amount?: number | null
          updated_at?: string
          wishlist_id: string
        }
        Update: {
          created_at?: string
          current_amount?: number | null
          display_order?: number | null
          fund_description?: string | null
          fund_name?: string
          id?: string
          is_active?: boolean | null
          target_amount?: number | null
          updated_at?: string
          wishlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_funds_wishlist_id_fkey"
            columns: ["wishlist_id"]
            isOneToOne: false
            referencedRelation: "wishlists"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          claimer_email: string | null
          claimer_name: string | null
          claimer_phone: string | null
          contribution_amount: number | null
          created_at: string
          expires_at: string | null
          id: string
          is_anonymous: boolean | null
          is_group_gift: boolean | null
          item_id: string
          notes: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string | null
          status: string | null
          thank_you_message: string | null
          thank_you_sent_at: string | null
          user_id: string | null
        }
        Insert: {
          claimer_email?: string | null
          claimer_name?: string | null
          claimer_phone?: string | null
          contribution_amount?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_group_gift?: boolean | null
          item_id: string
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          status?: string | null
          thank_you_message?: string | null
          thank_you_sent_at?: string | null
          user_id?: string | null
        }
        Update: {
          claimer_email?: string | null
          claimer_name?: string | null
          claimer_phone?: string | null
          contribution_amount?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_group_gift?: boolean | null
          item_id?: string
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          status?: string | null
          thank_you_message?: string | null
          thank_you_sent_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claims_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "group_gift_progress"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "claims_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "wishlist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string
          id: string
          is_admin: boolean | null
          is_banned: boolean | null
          is_premium: boolean | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name: string
          id: string
          is_admin?: boolean | null
          is_banned?: boolean | null
          is_premium?: boolean | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_admin?: boolean | null
          is_banned?: boolean | null
          is_premium?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          claim_id: string | null
          created_at: string
          description: string | null
          id: string
          reference: string | null
          status: string
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          claim_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reference?: string | null
          status?: string
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          claim_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reference?: string | null
          status?: string
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_comments: {
        Row: {
          comment_text: string
          commenter_email: string | null
          commenter_name: string
          created_at: string
          id: string
          is_anonymous: boolean | null
          item_id: string | null
          updated_at: string
          wishlist_id: string
        }
        Insert: {
          comment_text: string
          commenter_email?: string | null
          commenter_name: string
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          item_id?: string | null
          updated_at?: string
          wishlist_id: string
        }
        Update: {
          comment_text?: string
          commenter_email?: string | null
          commenter_name?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          item_id?: string | null
          updated_at?: string
          wishlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_comments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "group_gift_progress"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "wishlist_comments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "wishlist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_comments_wishlist_id_fkey"
            columns: ["wishlist_id"]
            isOneToOne: false
            referencedRelation: "wishlists"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_items: {
        Row: {
          allow_group_gifting: boolean
          category: string | null
          created_at: string
          description: string | null
          external_link: string | null
          id: string
          image_url: string | null
          item_type: string
          name: string
          price_max: number | null
          price_min: number | null
          priority: number | null
          updated_at: string
          wishlist_id: string
        }
        Insert: {
          allow_group_gifting?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          external_link?: string | null
          id?: string
          image_url?: string | null
          item_type?: string
          name: string
          price_max?: number | null
          price_min?: number | null
          priority?: number | null
          updated_at?: string
          wishlist_id: string
        }
        Update: {
          allow_group_gifting?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          external_link?: string | null
          id?: string
          image_url?: string | null
          item_type?: string
          name?: string
          price_max?: number | null
          price_min?: number | null
          priority?: number | null
          updated_at?: string
          wishlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_wishlist_id_fkey"
            columns: ["wishlist_id"]
            isOneToOne: false
            referencedRelation: "wishlists"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          cover_image: string | null
          created_at: string
          currency: string
          description: string | null
          event_date: string | null
          event_type: string
          id: string
          is_featured: boolean | null
          is_public: boolean | null
          share_code: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_image?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          event_date?: string | null
          event_type: string
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          share_code?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_image?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          event_date?: string | null
          event_type?: string
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          share_code?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          account_name: string | null
          account_number: string | null
          admin_notes: string | null
          amount: number
          bank_name: string | null
          created_at: string
          id: string
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          admin_notes?: string | null
          amount: number
          bank_name?: string | null
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          wallet_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          admin_notes?: string | null
          amount?: number
          bank_name?: string | null
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      group_gift_progress: {
        Row: {
          contributor_count: number | null
          is_fully_funded: boolean | null
          item_id: string | null
          item_name: string | null
          progress_percentage: number | null
          raised_amount: number | null
          target_amount: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      expire_unpaid_claims: { Args: never; Returns: undefined }
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
