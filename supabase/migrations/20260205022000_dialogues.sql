-- Dialogue content for conversation practice
CREATE TABLE IF NOT EXISTS public.dialogues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level_id INTEGER REFERENCES public.levels(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  speaker TEXT NOT NULL,
  speaker_thai TEXT,
  emoji TEXT,
  thai TEXT NOT NULL,
  roman TEXT,
  english TEXT,
  correct TEXT,
  options JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dialogues_level_id ON public.dialogues (level_id, display_order);

ALTER TABLE public.dialogues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view dialogues" ON public.dialogues
  FOR SELECT USING (true);
