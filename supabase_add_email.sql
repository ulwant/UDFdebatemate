-- Run this SQL in your Supabase SQL Editor to add the email column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Update existing profiles with their email from auth.users
UPDATE public.profiles
SET email = auth.users.email
FROM auth.users
WHERE public.profiles.user_id = auth.users.id;

-- Update the trigger to automatically set the email for new profiles
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    member_type,
    debating_experience,
    discord_roles,
    contact_links,
    achievements,
    debating_history
  )
  VALUES (
    NEW.id,
    NEW.email,
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
    email = EXCLUDED.email,
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
