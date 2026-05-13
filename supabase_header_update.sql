-- Add header_picture_url to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS header_picture_url TEXT;

-- Update discord_roles to add assignable_by logic if you want to store it in DB (optional)
-- We are enforcing logic in UI, but it's good practice.
ALTER TABLE public.discord_roles
ADD COLUMN IF NOT EXISTS assignable_by TEXT DEFAULT 'member';

-- Note: The avatars bucket is already public and used for profile pictures.
-- We will use the same bucket to store header pictures to avoid creating new storage policies.
