-- 003 · Self-service account deletion.
-- Run this once in the Supabase SQL Editor. Safe to re-run.
--
-- Lets a signed-in user delete their OWN account, and only their own:
-- the function deletes auth.users WHERE id = auth.uid(), so it cannot be
-- pointed at anyone else. Presets and gallery rows are removed by their
-- ON DELETE CASCADE foreign keys; the app deletes the user's thumbnail
-- files from storage just before calling this.

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Only signed-in users may call it (never anonymous visitors).
REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_my_account() FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
