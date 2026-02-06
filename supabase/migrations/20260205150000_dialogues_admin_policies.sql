-- =====================================================
-- Dialogue admin write policies
-- Enables authenticated users to maintain dialogue rows.
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'dialogues'
      AND policyname = 'Authenticated can insert dialogues'
  ) THEN
    CREATE POLICY "Authenticated can insert dialogues"
      ON public.dialogues
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'dialogues'
      AND policyname = 'Authenticated can update dialogues'
  ) THEN
    CREATE POLICY "Authenticated can update dialogues"
      ON public.dialogues
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'dialogues'
      AND policyname = 'Authenticated can delete dialogues'
  ) THEN
    CREATE POLICY "Authenticated can delete dialogues"
      ON public.dialogues
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END
$$;
