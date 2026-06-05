-- Add faculty and major to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS faculty text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS major text;

-- Add color to calendar_events
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS color text;
