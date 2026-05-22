-- Registration and account approval flow.
-- Run this after the base profile SQL and before using public registration.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending_approval',
ADD COLUMN IF NOT EXISTS batch TEXT,
ADD COLUMN IF NOT EXISTS member_type TEXT DEFAULT 'newbie',
ADD COLUMN IF NOT EXISTS debating_experience TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_key ON public.profiles(user_id);

UPDATE public.profiles
SET approval_status = 'approved',
    approved_at = COALESCE(approved_at, now())
WHERE approval_status IS NULL
   OR system_role IN ('admin', 'eb');

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_approval_status_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_approval_status_check
CHECK (approval_status IN ('pending_profile', 'pending_approval', 'approved', 'rejected'));

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_member_type_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_member_type_check
CHECK (member_type IN ('newbie', 'member', 'alumni', 'guest'));

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    name,
    caption,
    bio,
    avatar_initials,
    avatar_color,
    system_role,
    approval_status,
    batch,
    member_type,
    debating_experience,
    discord_roles,
    contact_links,
    achievements,
    debating_history
  )
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(NEW.email, '@', 1)),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'caption', ''), 'Calon member UDF'),
    '',
    upper(left(COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(NEW.email, '@', 1)), 2)),
    'blue',
    'member',
    CASE
      WHEN NULLIF(NEW.raw_user_meta_data->>'name', '') IS NULL THEN 'pending_profile'
      ELSE 'pending_approval'
    END,
    NULLIF(NEW.raw_user_meta_data->>'batch', ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'member_type', ''), 'newbie'),
    NULLIF(NEW.raw_user_meta_data->>'debating_experience', ''),
    '[]'::jsonb,
    '{}'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    name = EXCLUDED.name,
    batch = EXCLUDED.batch,
    member_type = EXCLUDED.member_type,
    debating_experience = EXCLUDED.debating_experience,
    approval_status = CASE
      WHEN public.profiles.approval_status = 'pending_profile' THEN EXCLUDED.approval_status
      ELSE public.profiles.approval_status
    END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view approved profiles and own profile" ON public.profiles;
CREATE POLICY "Users can view approved profiles and own profile"
ON public.profiles
FOR SELECT
USING (
  approval_status = 'approved'
  OR auth.uid() = user_id
  OR (SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb')
);

DROP POLICY IF EXISTS "Admins and EB can approve profiles" ON public.profiles;
CREATE POLICY "Admins and EB can approve profiles"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() = user_id
  OR (SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb')
)
WITH CHECK (
  auth.uid() = user_id
  OR (SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb')
);
