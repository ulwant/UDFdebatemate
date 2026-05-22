-- Canonical competition, debate history, achievement base, and member submissions.
-- Run after supabase_registration_approval.sql.

CREATE TABLE IF NOT EXISTS public.competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  competition_date DATE,
  category TEXT,
  tab_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.competition_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE NOT NULL,
  team_name TEXT NOT NULL,
  category TEXT,
  format_type TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.competition_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.competition_teams(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'Speaker',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.competition_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.competition_teams(id) ON DELETE CASCADE NOT NULL,
  achievement_name TEXT,
  result_type TEXT DEFAULT 'Debate - Team',
  documentation_url TEXT,
  is_achievement BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.competition_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  draft JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  review_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.competition_submissions
DROP CONSTRAINT IF EXISTS competition_submissions_status_check;

ALTER TABLE public.competition_submissions
ADD CONSTRAINT competition_submissions_status_check
CHECK (status IN ('pending', 'approved', 'rejected'));

CREATE UNIQUE INDEX IF NOT EXISTS competitions_unique_key
ON public.competitions (lower(name), competition_date);

CREATE UNIQUE INDEX IF NOT EXISTS competition_teams_unique_key
ON public.competition_teams (competition_id, lower(team_name));

CREATE UNIQUE INDEX IF NOT EXISTS competition_participants_profile_key
ON public.competition_participants (team_id, profile_id)
WHERE profile_id IS NOT NULL;

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Approved members can read competitions" ON public.competitions;
CREATE POLICY "Approved members can read competitions"
ON public.competitions FOR SELECT
USING (
  (SELECT approval_status FROM public.profiles WHERE user_id = auth.uid()) = 'approved'
  OR (SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb')
);

DROP POLICY IF EXISTS "EB Admin can manage competitions" ON public.competitions;
CREATE POLICY "EB Admin can manage competitions"
ON public.competitions FOR ALL
USING ((SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb'))
WITH CHECK ((SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb'));

DROP POLICY IF EXISTS "Approved members can read competition teams" ON public.competition_teams;
CREATE POLICY "Approved members can read competition teams"
ON public.competition_teams FOR SELECT
USING (
  (SELECT approval_status FROM public.profiles WHERE user_id = auth.uid()) = 'approved'
  OR (SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb')
);

DROP POLICY IF EXISTS "EB Admin can manage competition teams" ON public.competition_teams;
CREATE POLICY "EB Admin can manage competition teams"
ON public.competition_teams FOR ALL
USING ((SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb'))
WITH CHECK ((SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb'));

DROP POLICY IF EXISTS "Approved members can read competition participants" ON public.competition_participants;
CREATE POLICY "Approved members can read competition participants"
ON public.competition_participants FOR SELECT
USING (
  (SELECT approval_status FROM public.profiles WHERE user_id = auth.uid()) = 'approved'
  OR (SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb')
);

DROP POLICY IF EXISTS "EB Admin can manage competition participants" ON public.competition_participants;
CREATE POLICY "EB Admin can manage competition participants"
ON public.competition_participants FOR ALL
USING ((SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb'))
WITH CHECK ((SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb'));

DROP POLICY IF EXISTS "Approved members can read competition results" ON public.competition_results;
CREATE POLICY "Approved members can read competition results"
ON public.competition_results FOR SELECT
USING (
  (SELECT approval_status FROM public.profiles WHERE user_id = auth.uid()) = 'approved'
  OR (SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb')
);

DROP POLICY IF EXISTS "EB Admin can manage competition results" ON public.competition_results;
CREATE POLICY "EB Admin can manage competition results"
ON public.competition_results FOR ALL
USING ((SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb'))
WITH CHECK ((SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb'));

DROP POLICY IF EXISTS "Users can create own competition submissions" ON public.competition_submissions;
CREATE POLICY "Users can create own competition submissions"
ON public.competition_submissions FOR INSERT
WITH CHECK (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "Users can read own competition submissions" ON public.competition_submissions;
CREATE POLICY "Users can read own competition submissions"
ON public.competition_submissions FOR SELECT
USING (
  auth.uid() = submitted_by
  OR (SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb')
);

DROP POLICY IF EXISTS "Users can delete own competition submissions" ON public.competition_submissions;
CREATE POLICY "Users can delete own competition submissions"
ON public.competition_submissions FOR DELETE
USING (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "EB Admin can review competition submissions" ON public.competition_submissions;
CREATE POLICY "EB Admin can review competition submissions"
ON public.competition_submissions FOR UPDATE
USING ((SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb'))
WITH CHECK ((SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb'));

