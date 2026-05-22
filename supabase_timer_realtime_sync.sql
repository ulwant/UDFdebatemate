-- Hybrid Realtime Sync Enhancement for Debate Timer
-- Adds sequence numbers and server timestamp sync to prevent stale updates and clock drift

-- Add columns to debate_timer_rooms table
ALTER TABLE public.debate_timer_rooms
ADD COLUMN IF NOT EXISTS sequence_number BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS server_synced_at BIGINT DEFAULT extract(epoch from now()) * 1000;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_debate_timer_rooms_sequence ON public.debate_timer_rooms(code, sequence_number);

-- Create a function to get current server time in milliseconds
CREATE OR REPLACE FUNCTION get_server_time_ms()
RETURNS BIGINT AS $$
BEGIN
  RETURN (extract(epoch from now()) * 1000)::BIGINT;
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger to auto-increment sequence_number on update
CREATE OR REPLACE FUNCTION increment_sequence_on_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sequence_number = OLD.sequence_number + 1;
  NEW.server_synced_at = get_server_time_ms();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_debate_timer_sequence_update ON public.debate_timer_rooms;
CREATE TRIGGER trg_debate_timer_sequence_update
BEFORE UPDATE ON public.debate_timer_rooms
FOR EACH ROW
EXECUTE FUNCTION increment_sequence_on_update();

-- Initialize sequence_number for existing rooms (set to 0 if NULL)
UPDATE public.debate_timer_rooms
SET sequence_number = 0
WHERE sequence_number IS NULL;

-- Initialize server_synced_at for existing rooms
UPDATE public.debate_timer_rooms
SET server_synced_at = get_server_time_ms()
WHERE server_synced_at IS NULL;
