-- Extra policies for the My Account attendance tracker.
-- Run this after supabase_rbac_presensi.sql and the avatar bucket SQL.

-- EB/Admin need INSERT because marking a member as "Tidak hadir" or "Izin"
-- creates a record when that member has not scanned the QR for that session.
DROP POLICY IF EXISTS "EB Admin can insert records for anyone" ON public.attendance_records;
CREATE POLICY "EB Admin can insert records for anyone"
ON public.attendance_records
FOR INSERT
WITH CHECK (
  (SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb')
);

-- Optional but helpful: normalize status values used by the dashboard.
ALTER TABLE public.attendance_records
DROP CONSTRAINT IF EXISTS attendance_records_status_check;

ALTER TABLE public.attendance_records
ADD CONSTRAINT attendance_records_status_check
CHECK (status IN ('Present', 'Absent', 'Excused'));

-- Weekly planning table for EB/Admin.
CREATE TABLE IF NOT EXISTS public.weekly_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.weekly_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read weekly sessions" ON public.weekly_sessions;
CREATE POLICY "Anyone can read weekly sessions"
ON public.weekly_sessions
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "EB Admin can manage weekly sessions" ON public.weekly_sessions;
CREATE POLICY "EB Admin can manage weekly sessions"
ON public.weekly_sessions
FOR ALL
USING (
  (SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb')
)
WITH CHECK (
  (SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb')
);

-- Link one QR attendance session to one weekly schedule.
ALTER TABLE public.attendance_sessions
ADD COLUMN IF NOT EXISTS weekly_session_id UUID REFERENCES public.weekly_sessions(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "EB Admin can update sessions" ON public.attendance_sessions;
CREATE POLICY "EB Admin can update sessions"
ON public.attendance_sessions
FOR UPDATE
USING (
  (SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb')
)
WITH CHECK (
  (SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb')
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'attendance_sessions_weekly_session_id_key'
  ) THEN
    ALTER TABLE public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_weekly_session_id_key UNIQUE (weekly_session_id);
  END IF;
END $$;
