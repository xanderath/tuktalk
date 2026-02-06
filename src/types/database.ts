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
      dialogues: {
        Row: {
          id: string
          level_id: number | null
          display_order: number
          speaker: string
          speaker_thai: string | null
          emoji: string | null
          thai: string
          roman: string | null
          english: string | null
          correct: string | null
          options: Json
          created_at: string | null
        }
        Insert: {
          id?: string
          level_id?: number | null
          display_order?: number
          speaker: string
          speaker_thai?: string | null
          emoji?: string | null
          thai: string
          roman?: string | null
          english?: string | null
          correct?: string | null
          options: Json
          created_at?: string | null
        }
        Update: {
          id?: string
          level_id?: number | null
          display_order?: number
          speaker?: string
          speaker_thai?: string | null
          emoji?: string | null
          thai?: string
          roman?: string | null
          english?: string | null
          correct?: string | null
          options?: Json
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'dialogues_level_id_fkey'
            columns: ['level_id']
            isOneToOne: false
            referencedRelation: 'levels'
            referencedColumns: ['id']
          },
        ]
      }
      level_vocabulary: {
        Row: {
          level_id: number
          vocabulary_id: string
          display_order: number
        }
        Insert: {
          level_id: number
          vocabulary_id: string
          display_order?: number
        }
        Update: {
          level_id?: number
          vocabulary_id?: string
          display_order?: number
        }
        Relationships: [
          {
            foreignKeyName: 'level_vocabulary_level_id_fkey'
            columns: ['level_id']
            isOneToOne: false
            referencedRelation: 'levels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'level_vocabulary_vocabulary_id_fkey'
            columns: ['vocabulary_id']
            isOneToOne: false
            referencedRelation: 'vocabulary'
            referencedColumns: ['id']
          },
        ]
      }
      levels: {
        Row: {
          id: number
          stage_id: number
          level_number: number
          environment_name: string
          is_free: boolean | null
          video_intro_url: string | null
          cultural_media_url: string | null
          game_world_config: Json | null
          created_at: string | null
        }
        Insert: {
          id: number
          stage_id: number
          level_number: number
          environment_name: string
          is_free?: boolean | null
          video_intro_url?: string | null
          cultural_media_url?: string | null
          game_world_config?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: number
          stage_id?: number
          level_number?: number
          environment_name?: string
          is_free?: boolean | null
          video_intro_url?: string | null
          cultural_media_url?: string | null
          game_world_config?: Json | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'levels_stage_id_fkey'
            columns: ['stage_id']
            isOneToOne: false
            referencedRelation: 'stages'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          is_admin: boolean
          display_name: string | null
          avatar_url: string | null
          current_level: number | null
          fluency_score: number | null
          streak_count: number | null
          streak_last_updated: string | null
          total_words_mastered: number | null
          total_time_spent_minutes: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          is_admin?: boolean
          display_name?: string | null
          avatar_url?: string | null
          current_level?: number | null
          fluency_score?: number | null
          streak_count?: number | null
          streak_last_updated?: string | null
          total_words_mastered?: number | null
          total_time_spent_minutes?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          is_admin?: boolean
          display_name?: string | null
          avatar_url?: string | null
          current_level?: number | null
          fluency_score?: number | null
          streak_count?: number | null
          streak_last_updated?: string | null
          total_words_mastered?: number | null
          total_time_spent_minutes?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_profile: {
        Row: {
          user_id: string
          tokens: number
          unlocked_levels: number[]
          unlocked_cosmetics: string[]
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          tokens?: number
          unlocked_levels?: number[]
          unlocked_cosmetics?: string[]
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          tokens?: number
          unlocked_levels?: number[]
          unlocked_cosmetics?: string[]
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_profile_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      review_sessions: {
        Row: {
          id: string
          user_id: string | null
          reviewed_count: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          reviewed_count?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          reviewed_count?: number | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'review_sessions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      session_stats: {
        Row: {
          id: string
          user_id: string
          level_id: number | null
          score: number
          words_learned: number
          accuracy: number
          time_seconds: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          level_id?: number | null
          score?: number
          words_learned?: number
          accuracy?: number
          time_seconds?: number
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          level_id?: number | null
          score?: number
          words_learned?: number
          accuracy?: number
          time_seconds?: number
          created_at?: string | null
        }
        Relationships: []
      }
      share_events: {
        Row: {
          id: string
          user_id: string | null
          share_context: string
          share_channel: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          share_context: string
          share_channel?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          share_context?: string
          share_channel?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'share_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      stages: {
        Row: {
          id: number
          name: string
          description: string | null
          goal: string | null
        }
        Insert: {
          id: number
          name: string
          description?: string | null
          goal?: string | null
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          goal?: string | null
        }
        Relationships: []
      }
      user_pronunciations: {
        Row: {
          id: string
          user_id: string
          vocabulary_id: string
          storage_path: string
          pronunciation_score: number
          transcript: string | null
          recognized_romanization: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          vocabulary_id: string
          storage_path: string
          pronunciation_score: number
          transcript?: string | null
          recognized_romanization?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          vocabulary_id?: string
          storage_path?: string
          pronunciation_score?: number
          transcript?: string | null
          recognized_romanization?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'user_pronunciations_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_pronunciations_vocabulary_id_fkey'
            columns: ['vocabulary_id']
            isOneToOne: false
            referencedRelation: 'vocabulary'
            referencedColumns: ['id']
          },
        ]
      }
      user_vocabulary_progress: {
        Row: {
          id: string
          user_id: string
          vocabulary_id: string
          srs_box: number | null
          times_correct: number | null
          times_incorrect: number | null
          incorrect_streak: number | null
          last_reviewed: string | null
          next_review_date: string | null
          is_problem_word: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          vocabulary_id: string
          srs_box?: number | null
          times_correct?: number | null
          times_incorrect?: number | null
          incorrect_streak?: number | null
          last_reviewed?: string | null
          next_review_date?: string | null
          is_problem_word?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          vocabulary_id?: string
          srs_box?: number | null
          times_correct?: number | null
          times_incorrect?: number | null
          incorrect_streak?: number | null
          last_reviewed?: string | null
          next_review_date?: string | null
          is_problem_word?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'user_vocabulary_progress_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_vocabulary_progress_vocabulary_id_fkey'
            columns: ['vocabulary_id']
            isOneToOne: false
            referencedRelation: 'vocabulary'
            referencedColumns: ['id']
          },
        ]
      }
      vocabulary: {
        Row: {
          id: string
          thai_script: string
          romanization: string
          english_translation: string
          icon_url: string | null
          audio_url: string | null
          morpheme_breakdown: Json | null
          part_of_speech: string | null
          difficulty_level: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          thai_script: string
          romanization: string
          english_translation: string
          icon_url?: string | null
          audio_url?: string | null
          morpheme_breakdown?: Json | null
          part_of_speech?: string | null
          difficulty_level?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          thai_script?: string
          romanization?: string
          english_translation?: string
          icon_url?: string | null
          audio_url?: string | null
          morpheme_breakdown?: Json | null
          part_of_speech?: string | null
          difficulty_level?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      seed_level_vocabulary: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      level_status: 'locked' | 'unlocked' | 'in_progress' | 'completed'
      subscription_plan: 'free' | 'monthly' | 'annual'
      subscription_status: 'free' | 'active' | 'cancelled' | 'expired'
    }
    CompositeTypes: Record<string, never>
  }
}
