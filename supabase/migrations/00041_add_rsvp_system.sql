-- Migration: 00041_add_rsvp_system.sql
-- Phase 1: Production-Ready RSVP System for Free Events

-- 1. Main RSVP table with proper constraints
CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('going', 'interested', 'not_going')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  CONSTRAINT unique_user_event_rsvp UNIQUE(event_id, user_id)
);

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_id ON public.event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user_id ON public.event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_status ON public.event_rsvps(status);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_status ON public.event_rsvps(event_id, status);

-- 3. Rate limiting table
CREATE TABLE IF NOT EXISTS public.rsvp_rate_limits (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  change_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_rsvp_rate_limits_window ON public.rsvp_rate_limits(window_start);

-- 4. Materialized count columns for performance
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS rsvp_going_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rsvp_interested_count INTEGER DEFAULT 0;

-- 5. Enable RLS
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvp_rate_limits ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies with privacy protection
CREATE POLICY "Users can view RSVPs for events they can access"
ON event_rsvps FOR SELECT
USING (
  -- See your own RSVPs
  user_id = auth.uid()
  OR
  -- See aggregate counts only for public events
  EXISTS (
    SELECT 1 FROM events e
    JOIN communities c ON e.community_id = c.id
    WHERE e.id = event_rsvps.event_id
    AND e.status = 'published'
    AND (
      c.is_public = true
      OR EXISTS (
        SELECT 1 FROM community_members cm
        WHERE cm.community_id = c.id
        AND cm.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can manage their own RSVPs"
ON event_rsvps FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can see their own rate limits"
ON rsvp_rate_limits FOR SELECT
USING (user_id = auth.uid());

-- 7. Functions for atomic operations

-- Capacity check with advisory locking
CREATE OR REPLACE FUNCTION check_event_capacity()
RETURNS TRIGGER AS $$
DECLARE
  current_going_count INTEGER;
  event_capacity INTEGER;
  lock_acquired BOOLEAN;
BEGIN
  -- Only check for 'going' status
  IF NEW.status != 'going' THEN
    RETURN NEW;
  END IF;

  -- Try to acquire advisory lock (prevent race conditions)
  lock_acquired := pg_try_advisory_xact_lock(
    hashtext('event_capacity_' || NEW.event_id)
  );

  IF NOT lock_acquired THEN
    RAISE EXCEPTION 'Capacity check in progress, please retry'
      USING ERRCODE = '55P03'; -- lock_not_available
  END IF;

  -- Get event capacity
  SELECT capacity INTO event_capacity
  FROM events WHERE id = NEW.event_id;

  -- If no capacity limit, allow
  IF event_capacity IS NULL OR event_capacity = 0 THEN
    RETURN NEW;
  END IF;

  -- Count current 'going' RSVPs (excluding current user)
  SELECT COUNT(*) INTO current_going_count
  FROM event_rsvps
  WHERE event_id = NEW.event_id
    AND status = 'going'
    AND user_id != NEW.user_id;

  -- Check capacity
  IF current_going_count >= event_capacity THEN
    RAISE EXCEPTION 'Event is at full capacity (%)', event_capacity
      USING ERRCODE = '23514'; -- check_violation
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Rate limiting function
CREATE OR REPLACE FUNCTION check_rsvp_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  changes_in_window INTEGER;
BEGIN
  -- Count recent changes
  SELECT change_count INTO changes_in_window
  FROM rsvp_rate_limits
  WHERE user_id = NEW.user_id
    AND event_id = NEW.event_id
    AND window_start > NOW() - INTERVAL '1 hour';

  IF changes_in_window >= 10 THEN
    RAISE EXCEPTION 'Too many RSVP changes. Please try again later.'
      USING ERRCODE = '42820'; -- rate_limit_exceeded
  END IF;

  -- Update or insert rate limit record
  INSERT INTO rsvp_rate_limits (user_id, event_id, change_count)
  VALUES (NEW.user_id, NEW.event_id, 1)
  ON CONFLICT (user_id, event_id)
  DO UPDATE SET
    change_count = CASE
      WHEN rsvp_rate_limits.window_start < NOW() - INTERVAL '1 hour'
      THEN 1
      ELSE rsvp_rate_limits.change_count + 1
    END,
    window_start = CASE
      WHEN rsvp_rate_limits.window_start < NOW() - INTERVAL '1 hour'
      THEN NOW()
      ELSE rsvp_rate_limits.window_start
    END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update materialized counts
CREATE OR REPLACE FUNCTION update_rsvp_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE events SET
    rsvp_going_count = (
      SELECT COUNT(*) FROM event_rsvps
      WHERE event_id = COALESCE(NEW.event_id, OLD.event_id)
      AND status = 'going'
    ),
    rsvp_interested_count = (
      SELECT COUNT(*) FROM event_rsvps
      WHERE event_id = COALESCE(NEW.event_id, OLD.event_id)
      AND status = 'interested'
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.event_id, OLD.event_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Handle event cancellation
CREATE OR REPLACE FUNCTION handle_event_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Event cancelled
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Mark all RSVPs as notified (for future email system)
    UPDATE event_rsvps
    SET metadata = metadata || jsonb_build_object(
      'cancellation_notified_at', NOW(),
      'previous_status', status
    )
    WHERE event_id = NEW.id;
  END IF;

  -- Event rescheduled
  IF NEW.start_at != OLD.start_at THEN
    UPDATE event_rsvps
    SET metadata = metadata || jsonb_build_object(
      'reschedule_notified_at', NOW(),
      'previous_start_at', OLD.start_at
    )
    WHERE event_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create triggers
CREATE TRIGGER enforce_event_capacity
  BEFORE INSERT OR UPDATE ON event_rsvps
  FOR EACH ROW EXECUTE FUNCTION check_event_capacity();

CREATE TRIGGER enforce_rsvp_rate_limit
  BEFORE INSERT OR UPDATE ON event_rsvps
  FOR EACH ROW EXECUTE FUNCTION check_rsvp_rate_limit();

CREATE TRIGGER update_event_rsvp_counts
  AFTER INSERT OR UPDATE OR DELETE ON event_rsvps
  FOR EACH ROW EXECUTE FUNCTION update_rsvp_counts();

CREATE TRIGGER handle_event_changes
  AFTER UPDATE ON events
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.start_at IS DISTINCT FROM NEW.start_at)
  EXECUTE FUNCTION handle_event_status_change();

-- 9. Create efficient view for event lists
CREATE OR REPLACE VIEW events_with_rsvp_summary AS
SELECT
  e.*,
  r.user_rsvp_status
FROM events e
LEFT JOIN LATERAL (
  SELECT status as user_rsvp_status
  FROM event_rsvps
  WHERE event_id = e.id
  AND user_id = auth.uid()
) r ON true;

-- 10. Cleanup function for orphaned RSVPs
CREATE OR REPLACE FUNCTION cleanup_orphaned_rsvps()
RETURNS void AS $$
BEGIN
  -- Remove RSVPs from deleted profiles
  DELETE FROM event_rsvps
  WHERE user_id NOT IN (SELECT id FROM profiles);

  -- Remove RSVPs for past events older than 30 days
  DELETE FROM event_rsvps
  WHERE event_id IN (
    SELECT id FROM events
    WHERE end_at < NOW() - INTERVAL '30 days'
  );
END;
$$ LANGUAGE plpgsql;