-- ─────────────────────────────────────────────────────────────
-- Timer Participants Update
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────

ALTER TABLE debate_timer_participants ADD COLUMN IF NOT EXISTS side text;
ALTER TABLE debate_timer_participants ADD COLUMN IF NOT EXISTS speaker_role text;
ALTER TABLE debate_timer_participants ADD COLUMN IF NOT EXISTS reply_speaker_role text;

-- Drop and recreate the view if needed, but since it's just adding columns, this is usually enough.
