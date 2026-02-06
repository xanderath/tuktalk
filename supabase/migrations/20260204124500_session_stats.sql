-- ============================================
-- KamJai Session Stats
-- ============================================

CREATE TABLE IF NOT EXISTS public.session_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    level_id INTEGER REFERENCES public.levels(id) ON DELETE SET NULL,
    score INTEGER DEFAULT 0,
    words_learned INTEGER DEFAULT 0,
    accuracy INTEGER DEFAULT 0,
    time_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.session_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own session stats" ON public.session_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own session stats" ON public.session_stats
    FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS session_stats_user_id_idx ON public.session_stats(user_id);
CREATE INDEX IF NOT EXISTS session_stats_created_at_idx ON public.session_stats(created_at);
