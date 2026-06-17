-- Profile, guest registration, and privacy update.
-- Run after supabase_registration_approval.sql.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS birthdate DATE,
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS faculty TEXT,
ADD COLUMN IF NOT EXISTS major TEXT,
ADD COLUMN IF NOT EXISTS delegation_status TEXT,
ADD COLUMN IF NOT EXISTS privacy_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'debating_history'
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN debating_history SET DEFAULT '[]'::jsonb;
    UPDATE public.profiles SET debating_history = '[]'::jsonb WHERE debating_history IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = '_legacy_debating_history'
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN _legacy_debating_history SET DEFAULT '[]'::jsonb;
    UPDATE public.profiles SET _legacy_debating_history = '[]'::jsonb WHERE _legacy_debating_history IS NULL;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
ON public.profiles (lower(username))
WHERE username IS NOT NULL AND username <> '';

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_delegation_status_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_delegation_status_check
CHECK (delegation_status IS NULL OR delegation_status IN ('delegasi', 'non-delegasi'));

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
DECLARE
  incoming_member_type TEXT := COALESCE(NULLIF(NEW.raw_user_meta_data->>'member_type', ''), 'newbie');
BEGIN
  INSERT INTO public.profiles (
    user_id,
    email,
    name,
    caption,
    bio,
    avatar_initials,
    avatar_color,
    system_role,
    approval_status,
    batch,
    birthdate,
    username,
    faculty,
    major,
    delegation_status,
    member_type,
    debating_experience,
    discord_roles,
    contact_links,
    privacy_settings,
    achievements
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(NEW.email, '@', 1)),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'caption', ''), CASE WHEN incoming_member_type = 'guest' THEN 'Guest Debate Mate' ELSE 'Calon member UDF' END),
    '',
    upper(left(COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(NEW.email, '@', 1)), 2)),
    'blue',
    CASE WHEN incoming_member_type = 'guest' THEN 'guest' ELSE 'member' END,
    CASE
      WHEN incoming_member_type = 'guest' THEN 'approved'
      WHEN NULLIF(NEW.raw_user_meta_data->>'name', '') IS NULL THEN 'pending_profile'
      ELSE 'pending_approval'
    END,
    NULLIF(NEW.raw_user_meta_data->>'batch', ''),
    NULLIF(NEW.raw_user_meta_data->>'birthdate', '')::date,
    NULLIF(NEW.raw_user_meta_data->>'username', ''),
    NULLIF(NEW.raw_user_meta_data->>'faculty', ''),
    NULLIF(NEW.raw_user_meta_data->>'major', ''),
    NULLIF(NEW.raw_user_meta_data->>'delegation_status', ''),
    incoming_member_type,
    NULL,
    '[]'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    '[]'::jsonb
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    caption = EXCLUDED.caption,
    batch = EXCLUDED.batch,
    birthdate = EXCLUDED.birthdate,
    username = EXCLUDED.username,
    faculty = EXCLUDED.faculty,
    major = EXCLUDED.major,
    delegation_status = EXCLUDED.delegation_status,
    member_type = EXCLUDED.member_type,
    system_role = CASE
      WHEN EXCLUDED.member_type = 'guest' THEN 'guest'
      ELSE public.profiles.system_role
    END,
    debating_experience = NULL,
    approval_status = CASE
      WHEN public.profiles.approval_status = 'pending_profile' OR EXCLUDED.member_type = 'guest' THEN EXCLUDED.approval_status
      ELSE public.profiles.approval_status
    END;

  RETURN NEW;
END;
$$;
