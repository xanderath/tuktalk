-- Seed helper: map vocabulary difficulty_level to level_vocabulary rows
CREATE OR REPLACE FUNCTION public.seed_level_vocabulary()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.level_vocabulary (level_id, vocabulary_id, display_order)
  SELECT
    v.difficulty_level AS level_id,
    v.id AS vocabulary_id,
    ROW_NUMBER() OVER (PARTITION BY v.difficulty_level ORDER BY v.id) AS display_order
  FROM public.vocabulary v
  WHERE v.difficulty_level IS NOT NULL
  ON CONFLICT (level_id, vocabulary_id) DO NOTHING;
END;
$$;

-- Run once on migration (idempotent)
SELECT public.seed_level_vocabulary();
