export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          timezone: string
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          timezone?: string
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          timezone?: string
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          timezone: string
          sleep_start: string
          sleep_end: string
          meal_breakfast_start: string | null
          meal_breakfast_duration: number | null
          meal_lunch_start: string | null
          meal_lunch_duration: number | null
          meal_dinner_start: string | null
          meal_dinner_duration: number | null
          buffer_minutes: number
          commute_morning_start: string | null
          commute_morning_duration: number | null
          commute_evening_start: string | null
          commute_evening_duration: number | null
          // Phase 5: Scheduling enhancements
          chronotype: 'early_bird' | 'night_owl' | 'intermediate'
          weekend_sleep_start: string | null
          weekend_sleep_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          timezone?: string
          sleep_start?: string
          sleep_end?: string
          meal_breakfast_start?: string | null
          meal_breakfast_duration?: number | null
          meal_lunch_start?: string | null
          meal_lunch_duration?: number | null
          meal_dinner_start?: string | null
          meal_dinner_duration?: number | null
          buffer_minutes?: number
          commute_morning_start?: string | null
          commute_morning_duration?: number | null
          commute_evening_start?: string | null
          commute_evening_duration?: number | null
          // Phase 5: Scheduling enhancements
          chronotype?: 'early_bird' | 'night_owl' | 'intermediate'
          weekend_sleep_start?: string | null
          weekend_sleep_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          timezone?: string
          sleep_start?: string
          sleep_end?: string
          meal_breakfast_start?: string | null
          meal_breakfast_duration?: number | null
          meal_lunch_start?: string | null
          meal_lunch_duration?: number | null
          meal_dinner_start?: string | null
          meal_dinner_duration?: number | null
          buffer_minutes?: number
          commute_morning_start?: string | null
          commute_morning_duration?: number | null
          commute_evening_start?: string | null
          commute_evening_duration?: number | null
          // Phase 5: Scheduling enhancements
          chronotype?: 'early_bird' | 'night_owl' | 'intermediate'
          weekend_sleep_start?: string | null
          weekend_sleep_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      fixed_commitments: {
        Row: {
          id: string
          user_id: string
          title: string
          day_of_week: number
          start_time: string
          end_time: string
          is_recurring: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          day_of_week: number
          start_time: string
          end_time: string
          is_recurring?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          is_recurring?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      life_realms: {
        Row: {
          id: string
          user_id: string
          name: string
          icon: string | null
          is_custom: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          icon?: string | null
          is_custom?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          icon?: string | null
          is_custom?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_goals: {
        Row: {
          id: string
          user_id: string
          realm_id: string
          title: string
          hours_per_week: number
          is_active: boolean
          // Phase 5: Scheduling enhancements
          cognitive_load: 'high' | 'medium' | 'low'
          requires_deep_work: boolean
          deadline: string | null
          deadline_type: 'hard' | 'soft' | 'none'
          anchor_type: 'none' | 'after_event' | 'before_event'
          anchor_event_id: string | null
          minimum_session_minutes: number
          preferred_session_minutes: number
          intensity_level: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          realm_id: string
          title: string
          hours_per_week: number
          is_active?: boolean
          // Phase 5: Scheduling enhancements
          cognitive_load?: 'high' | 'medium' | 'low'
          requires_deep_work?: boolean
          deadline?: string | null
          deadline_type?: 'hard' | 'soft' | 'none'
          anchor_type?: 'none' | 'after_event' | 'before_event'
          anchor_event_id?: string | null
          minimum_session_minutes?: number
          preferred_session_minutes?: number
          intensity_level?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          realm_id?: string
          title?: string
          hours_per_week?: number
          is_active?: boolean
          // Phase 5: Scheduling enhancements
          cognitive_load?: 'high' | 'medium' | 'low'
          requires_deep_work?: boolean
          deadline?: string | null
          deadline_type?: 'hard' | 'soft' | 'none'
          anchor_type?: 'none' | 'after_event' | 'before_event'
          anchor_event_id?: string | null
          minimum_session_minutes?: number
          preferred_session_minutes?: number
          intensity_level?: number
          created_at?: string
          updated_at?: string
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
