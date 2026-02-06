-- ============================================
-- KamJai Viral Share Events (Stub)
-- ============================================

CREATE TABLE IF NOT EXISTS public.share_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    share_context TEXT NOT NULL,
    share_channel TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.share_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own share events" ON public.share_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own share events" ON public.share_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS share_events_user_id_idx ON public.share_events(user_id);
