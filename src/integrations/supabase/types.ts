export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      barcode_products: {
        Row: {
          barcode: string
          brand: string | null
          category: string | null
          created_at: string
          current_weight: number | null
          default_expiry_days: number | null
          id: string
          last_weight_update: string | null
          nutrition_info: Json | null
          product_name: string
          updated_at: string
          weight_unit: string | null
        }
        Insert: {
          barcode: string
          brand?: string | null
          category?: string | null
          created_at?: string
          current_weight?: number | null
          default_expiry_days?: number | null
          id?: string
          last_weight_update?: string | null
          nutrition_info?: Json | null
          product_name: string
          updated_at?: string
          weight_unit?: string | null
        }
        Update: {
          barcode?: string
          brand?: string | null
          category?: string | null
          created_at?: string
          current_weight?: number | null
          default_expiry_days?: number | null
          id?: string
          last_weight_update?: string | null
          nutrition_info?: Json | null
          product_name?: string
          updated_at?: string
          weight_unit?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      device_registry: {
        Row: {
          created_at: string
          device_id: string
          device_name: string
          device_token: string
          id: string
          is_active: boolean
          last_seen: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          device_name: string
          device_token: string
          id?: string
          is_active?: boolean
          last_seen?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          device_name?: string
          device_token?: string
          id?: string
          is_active?: boolean
          last_seen?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      grocery_items: {
        Row: {
          amount: number | null
          barcode: string | null
          category_id: string | null
          created_at: string | null
          expiry_date: string | null
          id: string
          image_url: string | null
          name: string
          quantity: number | null
          quantity_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          barcode?: string | null
          category_id?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          name: string
          quantity?: number | null
          quantity_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          barcode?: string | null
          category_id?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          name?: string
          quantity?: number | null
          quantity_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grocery_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_delivery_log: {
        Row: {
          created_at: string | null
          delivery_details: Json | null
          delivery_method: string
          delivery_status: string
          id: string
          notification_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_details?: Json | null
          delivery_method: string
          delivery_status: string
          id?: string
          notification_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_details?: Json | null
          delivery_method?: string
          delivery_status?: string
          id?: string
          notification_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_log_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          product_details: Json | null
          product_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          product_details?: Json | null
          product_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          product_details?: Json | null
          product_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "grocery_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_expiry_dates: {
        Row: {
          barcode: string
          created_at: string
          expiry_date: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          barcode: string
          created_at?: string
          expiry_date: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          barcode?: string
          created_at?: string
          expiry_date?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          created_at: string
          email_notifications: boolean | null
          expiry_reminder_days: number | null
          id: string
          phone_notifications: boolean | null
          phone_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean | null
          expiry_reminder_days?: number | null
          id?: string
          phone_notifications?: boolean | null
          phone_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean | null
          expiry_reminder_days?: number | null
          id?: string
          phone_notifications?: boolean | null
          phone_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      waste_items: {
        Row: {
          amount: number | null
          category: string | null
          created_at: string
          id: string
          product_name: string
          quantity: number
          quantity_type: string
          updated_at: string
          user_id: string
          waste_date: string
          waste_reason: string
        }
        Insert: {
          amount?: number | null
          category?: string | null
          created_at?: string
          id?: string
          product_name: string
          quantity?: number
          quantity_type?: string
          updated_at?: string
          user_id: string
          waste_date?: string
          waste_reason: string
        }
        Update: {
          amount?: number | null
          category?: string | null
          created_at?: string
          id?: string
          product_name?: string
          quantity?: number
          quantity_type?: string
          updated_at?: string
          user_id?: string
          waste_date?: string
          waste_reason?: string
        }
        Relationships: []
      }
      weight_readings: {
        Row: {
          barcode: string
          battery_level: number | null
          created_at: string
          id: string
          sensor_id: string
          signal_strength: number | null
          temperature: number | null
          timestamp: string
          user_id: string
          weight_unit: string
          weight_value: number
        }
        Insert: {
          barcode: string
          battery_level?: number | null
          created_at?: string
          id?: string
          sensor_id: string
          signal_strength?: number | null
          temperature?: number | null
          timestamp?: string
          user_id: string
          weight_unit?: string
          weight_value: number
        }
        Update: {
          barcode?: string
          battery_level?: number | null
          created_at?: string
          id?: string
          sensor_id?: string
          signal_strength?: number | null
          temperature?: number | null
          timestamp?: string
          user_id?: string
          weight_unit?: string
          weight_value?: number
        }
        Relationships: []
      }
      weights: {
        Row: {
          battery_level: number | null
          created_at: string
          id: string
          product_id: string | null
          sensor_id: string
          signal_strength: number | null
          temperature: number | null
          timestamp: string
          unit: string
          updated_at: string
          user_id: string
          weight_value: number
        }
        Insert: {
          battery_level?: number | null
          created_at?: string
          id?: string
          product_id?: string | null
          sensor_id: string
          signal_strength?: number | null
          temperature?: number | null
          timestamp?: string
          unit?: string
          updated_at?: string
          user_id: string
          weight_value: number
        }
        Update: {
          battery_level?: number | null
          created_at?: string
          id?: string
          product_id?: string | null
          sensor_id?: string
          signal_strength?: number | null
          temperature?: number | null
          timestamp?: string
          unit?: string
          updated_at?: string
          user_id?: string
          weight_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "weights_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "grocery_items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      send_password_reset_email: {
        Args: { user_email: string; reset_link: string }
        Returns: Json
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
