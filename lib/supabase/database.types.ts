export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          website: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      communities: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          avatar_url: string | null
          cover_image_url: string | null
          organizer_id: string
          is_public: boolean
          member_count: number
          created_at: string
          updated_at: string
          search_tsv: unknown | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          avatar_url?: string | null
          cover_image_url?: string | null
          organizer_id: string
          is_public?: boolean
          member_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          avatar_url?: string | null
          cover_image_url?: string | null
          organizer_id?: string
          is_public?: boolean
          member_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communities_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      community_members: {
        Row: {
          id: string
          community_id: string
          user_id: string
          role: 'member' | 'moderator' | 'admin'
          joined_at: string
        }
        Insert: {
          id?: string
          community_id: string
          user_id: string
          role?: 'member' | 'moderator' | 'admin'
          joined_at?: string
        }
        Update: {
          id?: string
          community_id?: string
          user_id?: string
          role?: 'member' | 'moderator' | 'admin'
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      events: {
        Row: {
          id: string
          community_id: string
          title: string
          slug: string
          description: string | null
          cover_image_url: string | null
          start_at: string
          end_at: string
          venue_name: string | null
          venue_address: string | null
          venue_lat: number | null
          venue_lng: number | null
          venue_geo: unknown | null
          is_online: boolean
          online_url: string | null
          capacity: number | null
          tickets_sold: number
          price: number
          currency: string
          status: 'draft' | 'published' | 'cancelled' | 'completed'
          created_by: string
          created_at: string
          updated_at: string
          search_tsv: unknown | null
        }
        Insert: {
          id?: string
          community_id: string
          title: string
          slug: string
          description?: string | null
          cover_image_url?: string | null
          start_at: string
          end_at: string
          venue_name?: string | null
          venue_address?: string | null
          venue_lat?: number | null
          venue_lng?: number | null
          is_online?: boolean
          online_url?: string | null
          capacity?: number | null
          tickets_sold?: number
          price?: number
          currency?: string
          status?: 'draft' | 'published' | 'cancelled' | 'completed'
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          community_id?: string
          title?: string
          slug?: string
          description?: string | null
          cover_image_url?: string | null
          start_at?: string
          end_at?: string
          venue_name?: string | null
          venue_address?: string | null
          venue_lat?: number | null
          venue_lng?: number | null
          is_online?: boolean
          online_url?: string | null
          capacity?: number | null
          tickets_sold?: number
          price?: number
          currency?: string
          status?: 'draft' | 'published' | 'cancelled' | 'completed'
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      tickets: {
        Row: {
          id: string
          event_id: string
          user_id: string
          order_id: string | null
          amount: number
          currency: string
          status: 'pending' | 'confirmed' | 'cancelled' | 'refunded' | 'checked_in'
          stripe_payment_intent_id: string | null
          stripe_charge_id: string | null
          qr_code: string | null
          purchased_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          order_id?: string | null
          amount: number
          currency?: string
          status?: 'pending' | 'confirmed' | 'cancelled' | 'refunded' | 'checked_in'
          stripe_payment_intent_id?: string | null
          stripe_charge_id?: string | null
          qr_code?: string | null
          purchased_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          order_id?: string | null
          amount?: number
          currency?: string
          status?: 'pending' | 'confirmed' | 'cancelled' | 'refunded' | 'checked_in'
          stripe_payment_intent_id?: string | null
          stripe_charge_id?: string | null
          qr_code?: string | null
          purchased_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ]
      }
      orders: {
        Row: {
          id: string
          buyer_id: string | null
          event_id: string
          quantity: number
          amount_cents: number
          currency: string
          provider: 'stripe' | 'iyzico' | 'paypal' | null
          provider_ref: string | null
          status: 'pending' | 'paid' | 'refunded' | 'failed'
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          buyer_id?: string | null
          event_id: string
          quantity: number
          amount_cents: number
          currency?: string
          provider?: 'stripe' | 'iyzico' | 'paypal' | null
          provider_ref?: string | null
          status?: 'pending' | 'paid' | 'refunded' | 'failed'
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          buyer_id?: string | null
          event_id?: string
          quantity?: number
          amount_cents?: number
          currency?: string
          provider?: 'stripe' | 'iyzico' | 'paypal' | null
          provider_ref?: string | null
          status?: 'pending' | 'paid' | 'refunded' | 'failed'
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          }
        ]
      }
      passes: {
        Row: {
          id: string
          ticket_id: string
          secure_code: string
          status: 'valid' | 'used' | 'revoked'
          last_refreshed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          secure_code: string
          status?: 'valid' | 'used' | 'revoked'
          last_refreshed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          secure_code?: string
          status?: 'valid' | 'used' | 'revoked'
          last_refreshed_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "passes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          }
        ]
      }
      checkins: {
        Row: {
          id: string
          ticket_id: string
          pass_id: string | null
          scanned_by: string | null
          scanned_at: string
          result: 'ok' | 'already_used' | 'revoked' | 'invalid'
          metadata: Json
        }
        Insert: {
          id?: string
          ticket_id: string
          pass_id?: string | null
          scanned_by?: string | null
          scanned_at?: string
          result: 'ok' | 'already_used' | 'revoked' | 'invalid'
          metadata?: Json
        }
        Update: {
          id?: string
          ticket_id?: string
          pass_id?: string | null
          scanned_by?: string | null
          scanned_at?: string
          result?: 'ok' | 'already_used' | 'revoked' | 'invalid'
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "checkins_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_pass_id_fkey"
            columns: ["pass_id"]
            isOneToOne: false
            referencedRelation: "passes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {}
    Functions: {
      purchase_ticket: {
        Args: {
          p_event_id: string
          p_user_id: string
          p_amount: number
          p_currency?: string
        }
        Returns: string
      }
      generate_pass_for_ticket: {
        Args: {
          p_ticket_id: string
        }
        Returns: string
      }
      process_checkin: {
        Args: {
          p_secure_code: string
          p_scanned_by: string
        }
        Returns: Json
      }
      get_event_stats: {
        Args: {
          p_event_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      event_status: 'draft' | 'published' | 'cancelled' | 'completed'
      ticket_status: 'pending' | 'confirmed' | 'cancelled' | 'refunded' | 'checked_in'
      member_role: 'member' | 'moderator' | 'admin'
    }
    CompositeTypes: {}
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never