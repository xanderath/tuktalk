-- =====================================================
-- Dialogue admin role hardening
-- Adds profiles.is_admin and restricts dialogue writes to admins.
-- =====================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

DROP POLICY IF EXISTS "Authenticated can insert dialogues" ON public.dialogues;
DROP POLICY IF EXISTS "Authenticated can update dialogues" ON public.dialogues;
DROP POLICY IF EXISTS "Authenticated can delete dialogues" ON public.dialogues;

CREATE POLICY "Admins can insert dialogues"
  ON public.dialogues
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_admin = TRUE
    )
  );

CREATE POLICY "Admins can update dialogues"
  ON public.dialogues
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_admin = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_admin = TRUE
    )
  );

CREATE POLICY "Admins can delete dialogues"
  ON public.dialogues
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_admin = TRUE
    )
  );
