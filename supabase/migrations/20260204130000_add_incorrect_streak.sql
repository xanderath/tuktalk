-- ============================================
-- Add incorrect_streak to user_vocabulary_progress
-- ============================================

ALTER TABLE public.user_vocabulary_progress
ADD COLUMN IF NOT EXISTS incorrect_streak INTEGER DEFAULT 0 CHECK (incorrect_streak >= 0);
