-- =====================================================
-- User profile progression for Story/Arcade systems
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_profile (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  tokens INTEGER NOT NULL DEFAULT 0 CHECK (tokens >= 0),
  unlocked_levels INTEGER[] NOT NULL DEFAULT ARRAY[1],
  unlocked_cosmetics TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  settings JSONB NOT NULL DEFAULT '{
    "voiceModeEnabled": true,
    "publicModeEnabled": false,
    "showRomanization": true,
    "showEnglishMeaning": false
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profile_tokens ON public.user_profile(tokens);

ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own user_profile" ON public.user_profile;
CREATE POLICY "Users can view own user_profile"
  ON public.user_profile
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own user_profile" ON public.user_profile;
CREATE POLICY "Users can insert own user_profile"
  ON public.user_profile
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own user_profile" ON public.user_profile;
CREATE POLICY "Users can update own user_profile"
  ON public.user_profile
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own user_profile" ON public.user_profile;
CREATE POLICY "Users can delete own user_profile"
  ON public.user_profile
  FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_profile_updated_at ON public.user_profile;
CREATE TRIGGER update_user_profile_updated_at
  BEFORE UPDATE ON public.user_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.user_profile (user_id)
SELECT id
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;
