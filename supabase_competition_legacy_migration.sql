-- Optional one-time migration from profiles.achievements into canonical competition records.
-- Run only after checking backups and after supabase_competition_records.sql.

DO $$
DECLARE
  profile_row RECORD;
  achievement_item JSONB;
  competition_id UUID;
  team_id UUID;
  participant_text TEXT;
  competition_name TEXT;
  achievement_name TEXT;
  achievement_date DATE;
BEGIN
  FOR profile_row IN
    SELECT id, user_id, name, achievements
    FROM public.profiles
    WHERE jsonb_typeof(achievements::jsonb) = 'array'
  LOOP
    FOR achievement_item IN SELECT * FROM jsonb_array_elements(profile_row.achievements::jsonb)
    LOOP
      competition_name := COALESCE(NULLIF(achievement_item->>'competition', ''), 'Legacy Competition');
      achievement_name := COALESCE(NULLIF(achievement_item->>'name', ''), 'Legacy Achievement');
      participant_text := COALESCE(NULLIF(achievement_item->>'participant', ''), profile_row.name, 'Legacy Team');
      achievement_date := NULLIF(achievement_item->>'date', '')::DATE;

      INSERT INTO public.competitions (name, competition_date, category, tab_url, created_by)
      VALUES (
        competition_name,
        achievement_date,
        NULLIF(achievement_item->>'category', ''),
        NULLIF(achievement_item->>'tab_url', ''),
        profile_row.user_id
      )
      ON CONFLICT (lower(name), competition_date) DO UPDATE
      SET name = EXCLUDED.name
      RETURNING id INTO competition_id;

      INSERT INTO public.competition_teams (competition_id, team_name, category, format_type, created_by)
      VALUES (
        competition_id,
        participant_text,
        COALESCE(NULLIF(achievement_item->>'category', ''), 'Open'),
        COALESCE(NULLIF(achievement_item->>'type', ''), 'Debate - Team'),
        profile_row.user_id
      )
      ON CONFLICT (competition_id, lower(team_name)) DO UPDATE
      SET team_name = EXCLUDED.team_name
      RETURNING id INTO team_id;

      INSERT INTO public.competition_participants (team_id, profile_id, display_name, role)
      VALUES (team_id, profile_row.id, COALESCE(profile_row.name, participant_text), 'Speaker')
      ON CONFLICT DO NOTHING;

      INSERT INTO public.competition_results (team_id, achievement_name, result_type, documentation_url, is_achievement, created_by)
      VALUES (
        team_id,
        achievement_name,
        COALESCE(NULLIF(achievement_item->>'type', ''), 'Debate - Team'),
        NULLIF(achievement_item->>'documentation', ''),
        true,
        profile_row.user_id
      );
    END LOOP;
  END LOOP;
END $$;

