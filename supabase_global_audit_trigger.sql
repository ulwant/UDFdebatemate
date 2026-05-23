-- ==========================================
-- 1. Create Efficient Audit Function (Diffs Only)
-- ==========================================
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS trigger AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_diff jsonb;
  v_actor_id uuid;
BEGIN
  -- Capture the user performing the action from Supabase Auth context
  v_actor_id := auth.uid();
  
  IF TG_OP = 'INSERT' THEN
    v_new := row_to_json(NEW)::jsonb;
    -- Only log the ID to prevent massive JSON bloat on creation
    v_diff := jsonb_build_object('record_id', v_new->>'id');
    
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := row_to_json(OLD)::jsonb;
    v_new := row_to_json(NEW)::jsonb;
    
    -- Calculate precise difference (only fields that changed)
    SELECT jsonb_object_agg(n.key, n.value)
    INTO v_diff
    FROM jsonb_each(v_new) n
    JOIN jsonb_each(v_old) o ON n.key = o.key
    WHERE n.value IS DISTINCT FROM o.value;
    
    -- If no actual changes were made, abort logging
    IF v_diff IS NULL OR v_diff = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
    
    -- Always include record ID for tracking
    v_diff := v_diff || jsonb_build_object('record_id', v_new->>'id');
    
  ELSIF TG_OP = 'DELETE' THEN
    v_old := row_to_json(OLD)::jsonb;
    v_diff := jsonb_build_object('record_id', v_old->>'id', 'deleted', true);
  END IF;

  -- Insert log
  INSERT INTO public.audit_logs (actor_id, action_type, details)
  VALUES (
    v_actor_id,
    TG_OP || '_' || upper(TG_TABLE_NAME),
    v_diff
  );

  -- Self-Cleaning Mechanism: Keep only the latest 10,000 logs to prevent bloat
  -- Runs roughly 1% of the time to avoid performance impact on every query
  IF random() < 0.01 THEN
    DELETE FROM public.audit_logs 
    WHERE id IN (
      SELECT id FROM public.audit_logs 
      ORDER BY created_at DESC 
      OFFSET 10000
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 2. Attach Trigger to Important Tables
-- ==========================================

-- A helper function to easily attach the trigger to any table
CREATE OR REPLACE FUNCTION attach_audit_trigger(table_name text)
RETURNS void AS $$
BEGIN
  EXECUTE format('DROP TRIGGER IF EXISTS audit_trigger_row ON %I', table_name);
  EXECUTE format('
    CREATE TRIGGER audit_trigger_row
    AFTER INSERT OR UPDATE OR DELETE ON %I
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger()
  ', table_name);
END;
$$ LANGUAGE plpgsql;

-- Attach to key tables
SELECT attach_audit_trigger('profiles');
SELECT attach_audit_trigger('weekly_sessions');
SELECT attach_audit_trigger('calendar_events');
SELECT attach_audit_trigger('discord_roles');
SELECT attach_audit_trigger('competitions');
SELECT attach_audit_trigger('competition_teams');
SELECT attach_audit_trigger('competition_participants');
SELECT attach_audit_trigger('competition_results');

-- Cleanup helper function (not needed anymore)
DROP FUNCTION attach_audit_trigger(text);
