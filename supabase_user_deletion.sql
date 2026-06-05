-- Fix foreign key constraint to CASCADE delete profiles when auth.users is deleted
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_user_id_fkey' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_user_id_fkey;
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- RPC to delete own user
CREATE OR REPLACE FUNCTION public.delete_own_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- RPC to delete user by admin
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin boolean;
BEGIN
    SELECT COALESCE(system_role = 'admin', false)
    INTO is_admin
    FROM public.profiles
    WHERE user_id = auth.uid();

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Only administrators can delete users';
    END IF;

    DELETE FROM auth.users WHERE id = target_uid;
END;
$$;
