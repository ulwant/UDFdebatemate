-- ============================================================
-- SUPABASE OPTIMIZATION MASTER SCRIPT
-- Project: Debate Mate
-- Description: Adds performance indexes and cleans up legacy columns safely.
-- Note: This script is idempotent and safe to run multiple times.
-- ============================================================

-- ------------------------------------------------------------
-- PHASE 1: PERFORMANCE INDEXES (Safe to run multiple times)
-- Adds missing indexes for the most heavily queried columns
-- ------------------------------------------------------------

-- 1. profiles.user_id: Used in almost every single query and RLS policy
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);

-- 2. profiles.approval_status: Used in dashboard counts and profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON public.profiles (approval_status);

-- 3. profiles.system_role: Critical for almost every RLS policy (admin/eb checks)
CREATE INDEX IF NOT EXISTS idx_profiles_system_role ON public.profiles (system_role);

-- 4. notifications.user_id: Used in TopBar query
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);

-- 5. notifications.created_at: Used in TopBar query sorting
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);

-- 6. attendance_records.session_id: Used in Attendance page join
CREATE INDEX IF NOT EXISTS idx_attendance_records_session_id ON public.attendance_records (session_id);

-- 7. attendance_records.user_id: Used in AccountSettings query
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_id ON public.attendance_records (user_id);

-- 8. bookmarks.user_id: Used in MotionBank to show user's bookmarks
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks (user_id);

-- 9. motions.created_at: Used for MotionBank pagination
CREATE INDEX IF NOT EXISTS idx_motions_created_at ON public.motions (created_at DESC);

-- 10. competition_teams.competition_id: Used in deep joins for CompetitionRecord
CREATE INDEX IF NOT EXISTS idx_competition_teams_competition_id ON public.competition_teams (competition_id);

-- 11. competition_participants.team_id: Used in deep joins for CompetitionRecord
CREATE INDEX IF NOT EXISTS idx_competition_participants_team_id ON public.competition_participants (team_id);

-- 12. competition_results.team_id: Used in deep joins for CompetitionRecord
CREATE INDEX IF NOT EXISTS idx_competition_results_team_id ON public.competition_results (team_id);

-- 13. notifications composite index: Highly optimized for the exact TopBar query
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_time ON public.notifications (user_id, is_read, created_at DESC);


-- ------------------------------------------------------------
-- PHASE 2: LEGACY COLUMN CLEANUP
-- Safely renames completely unused columns to hide them from standard queries,
-- while preserving the actual data just in case.
-- ------------------------------------------------------------

DO $$ 
BEGIN
  -- 1. Rename 'debating_history' to '_legacy_debating_history' (100% unused by frontend)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='debating_history') THEN
    ALTER TABLE public.profiles RENAME COLUMN debating_history TO _legacy_debating_history;
  END IF;

  -- 2. Rename 'role' to '_legacy_role' (Frontend uses 'system_role', this is 100% unused)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role') THEN
    ALTER TABLE public.profiles RENAME COLUMN role TO _legacy_role;
  END IF;
END $$;


-- ------------------------------------------------------------
-- PHASE 3: DOCUMENTATION COMMENTS
-- Adds explicit comments to the database schema for future maintainers
-- ------------------------------------------------------------

-- Add a warning comment to achievements since it's still used as a fallback
COMMENT ON COLUMN public.profiles.achievements IS 
  'SEMI-LEGACY: Main data has been migrated to competition_results table, but this column is STILL QUERIED by the achievements page as a fallback. DO NOT DELETE until frontend is refactored.';

-- Document the newly renamed legacy columns
COMMENT ON COLUMN public.profiles._legacy_debating_history IS 
  'LEGACY: Renamed from debating_history. Never used by frontend. Safe to delete in future.';

COMMENT ON COLUMN public.profiles._legacy_role IS 
  'LEGACY: Renamed from role. Replaced by system_role. Never used by frontend. Safe to delete in future.';
