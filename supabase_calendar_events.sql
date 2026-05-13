-- Calendar events are separate from weekly_sessions.
-- Use weekly_sessions only for recurring weekly/presensi planning.

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE,
  location TEXT,
  notes TEXT,
  visibility TEXT NOT NULL DEFAULT 'public',
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT calendar_events_visibility_check CHECK (visibility IN ('public', 'eb_admin')),
  CONSTRAINT calendar_events_time_check CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read visible calendar events" ON public.calendar_events;
CREATE POLICY "Members can read visible calendar events"
ON public.calendar_events
FOR SELECT
USING (
  visibility = 'public'
  OR (SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb')
);

DROP POLICY IF EXISTS "EB Admin can manage calendar events" ON public.calendar_events;
CREATE POLICY "EB Admin can manage calendar events"
ON public.calendar_events
FOR ALL
USING (
  (SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb')
)
WITH CHECK (
  (SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb')
);

CREATE INDEX IF NOT EXISTS calendar_events_starts_at_idx
ON public.calendar_events (starts_at);

CREATE INDEX IF NOT EXISTS calendar_events_visibility_idx
ON public.calendar_events (visibility);
