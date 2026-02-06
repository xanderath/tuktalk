-- ============================================
-- Review Sessions (for review streaks and daily goals)
-- ============================================

CREATE TABLE IF NOT EXISTS public.review_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reviewed_count INTEGER DEFAULT 0 CHECK (reviewed_count >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.review_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own review sessions" ON public.review_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own review sessions" ON public.review_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS review_sessions_user_id_idx ON public.review_sessions(user_id);
CREATE INDEX IF NOT EXISTS review_sessions_created_at_idx ON public.review_sessions(created_at);
