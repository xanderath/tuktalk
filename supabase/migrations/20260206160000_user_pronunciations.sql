-- =====================================================
-- User pronunciation recordings
-- Stores user-recorded audio and metadata for glossary playback.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_pronunciations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vocabulary_id UUID NOT NULL REFERENCES public.vocabulary(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  pronunciation_score INTEGER NOT NULL CHECK (pronunciation_score >= 0 AND pronunciation_score <= 100),
  transcript TEXT,
  recognized_romanization TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, vocabulary_id)
);

CREATE INDEX IF NOT EXISTS idx_user_pronunciations_vocabulary_id
  ON public.user_pronunciations(vocabulary_id);

ALTER TABLE public.user_pronunciations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own pronunciations" ON public.user_pronunciations;
CREATE POLICY "Users can view own pronunciations"
  ON public.user_pronunciations
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own pronunciations" ON public.user_pronunciations;
CREATE POLICY "Users can insert own pronunciations"
  ON public.user_pronunciations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own pronunciations" ON public.user_pronunciations;
CREATE POLICY "Users can update own pronunciations"
  ON public.user_pronunciations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own pronunciations" ON public.user_pronunciations;
CREATE POLICY "Users can delete own pronunciations"
  ON public.user_pronunciations
  FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_pronunciations_updated_at ON public.user_pronunciations;
CREATE TRIGGER update_user_pronunciations_updated_at
  BEFORE UPDATE ON public.user_pronunciations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Storage bucket for user-recorded pronunciation audio.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-pronunciations',
  'user-pronunciations',
  FALSE,
  10485760,
  ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own pronunciation audio" ON storage.objects;
CREATE POLICY "Users can upload own pronunciation audio"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-pronunciations'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can read own pronunciation audio" ON storage.objects;
CREATE POLICY "Users can read own pronunciation audio"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-pronunciations'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update own pronunciation audio" ON storage.objects;
CREATE POLICY "Users can update own pronunciation audio"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'user-pronunciations'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'user-pronunciations'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own pronunciation audio" ON storage.objects;
CREATE POLICY "Users can delete own pronunciation audio"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-pronunciations'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
