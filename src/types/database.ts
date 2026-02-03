export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          current_level: number
          fluency_score: number
          streak_count: number
          streak_last_updated: string | null
          total_words_mastered: number
          total_time_spent_minutes: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
        }
        Update: {
          display_name?: string | null
          current_level?: number
        }
      }
      vocabulary: {
        Row: {
          id: string
          thai_script: string
          romanization: string
          english_translation: string
          difficulty_level: number
        }
      }
      levels: {
        Row: {
          id: number
          stage_id: number
          level_number: number
          environment_name: string
          is_free: boolean
        }
      }
      stages: {
        Row: {
          id: number
          name: string
          description: string | null
        }
      }
    }
  }
}
