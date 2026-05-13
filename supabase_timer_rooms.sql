-- Debate timer room lobby support.
-- Run this in Supabase before using /timer/room from different browsers/incognito.

CREATE TABLE IF NOT EXISTS public.debate_timer_rooms (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Debate Room',
  phase TEXT NOT NULL DEFAULT 'lobby',
  snapshot JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.debate_timer_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT REFERENCES public.debate_timer_rooms(code) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.debate_timer_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debate_timer_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read timer rooms" ON public.debate_timer_rooms;
CREATE POLICY "Anyone can read timer rooms"
ON public.debate_timer_rooms FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Anyone can create timer rooms" ON public.debate_timer_rooms;
CREATE POLICY "Anyone can create timer rooms"
ON public.debate_timer_rooms FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update timer rooms" ON public.debate_timer_rooms;
CREATE POLICY "Anyone can update timer rooms"
ON public.debate_timer_rooms FOR UPDATE
USING (true);

DROP POLICY IF EXISTS "Anyone can delete timer rooms" ON public.debate_timer_rooms;
CREATE POLICY "Anyone can delete timer rooms"
ON public.debate_timer_rooms FOR DELETE
USING (true);

DROP POLICY IF EXISTS "Anyone can read timer participants" ON public.debate_timer_participants;
CREATE POLICY "Anyone can read timer participants"
ON public.debate_timer_participants FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Anyone can create timer participants" ON public.debate_timer_participants;
CREATE POLICY "Anyone can create timer participants"
ON public.debate_timer_participants FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update timer participants" ON public.debate_timer_participants;
CREATE POLICY "Anyone can update timer participants"
ON public.debate_timer_participants FOR UPDATE
USING (true);

DROP POLICY IF EXISTS "Anyone can delete timer participants" ON public.debate_timer_participants;
CREATE POLICY "Anyone can delete timer participants"
ON public.debate_timer_participants FOR DELETE
USING (true);
